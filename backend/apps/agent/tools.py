"""Agent tools. Plain functions over student-scoped data.

Ownership rule: every tool receives a StudentProfile and only ever queries
rows belonging to it. The orchestrator loads the student from the AgentRun
row (created from request.user) — tool inputs can never escalate scope.
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.assessments.models import Answer
from apps.gaps.models import GapStatus, LearningGap
from apps.plans.models import StudyPlan
from apps.plans.serializers import StudyPlanItemSerializer
from apps.progress.models import Progress
from apps.resources.models import LearningResource

from .fetch import FetchSkipped, FetchResult, fetch_url
from .providers.base import (
    Evaluation,
    GapCard,
    LLMProvider,
    ProviderError,
    SearchCandidate,
    SearchProvider,
)
from .providers.local import (
    deterministic_evaluate,
    difficulty_for_level,
    template_item_text,
    template_report_summary,
)


class AgentToolError(Exception):
    """Tool failure that should fail the run with a clean error record."""


class OwnershipError(AgentToolError):
    """A referenced object does not belong to the run's student."""


def inspect_learning_gaps(student, gap_ids: list | None = None) -> list:
    """Read the student's open gaps with per-topic evidence. Deterministic, DB only."""
    gaps = student.gaps.filter(status__in=[GapStatus.OPEN, GapStatus.IN_PROGRESS])
    if gap_ids is not None:
        gaps = gaps.filter(id__in=gap_ids)
        found = set(gaps.values_list("id", flat=True))
        missing = set(gap_ids) - found
        if missing:
            raise OwnershipError(f"Gaps not available to this student: {sorted(missing)}")
    cards = []
    for gap in gaps.order_by("-updated_at"):
        wrong = Answer.objects.filter(
            attempt__student=student,
            is_correct=False,
            question__topic__iexact=gap.topic,
        )
        attempt_ids = list(
            wrong.order_by("-answered_at").values_list("attempt_id", flat=True)[:5]
        )
        cards.append(
            GapCard(
                gap_id=gap.id,
                subject=gap.subject,
                topic=gap.topic,
                severity=gap.severity,
                evidence=gap.evidence or gap.description,
                wrong_count=wrong.count(),
                recent_attempt_ids=attempt_ids,
            )
        )
    return cards


def search_learning_resources(
    subject: str, topic: str, level: str, limit: int, provider: SearchProvider
) -> list:
    """Discover candidate resources via the configured provider."""
    try:
        return provider.search(subject, topic, level, limit)
    except Exception as exc:
        raise AgentToolError(f"Resource search failed: {type(exc).__name__}") from exc


def fetch_resource(url: str, timeout: float = 20.0) -> FetchResult:
    """Fetch one candidate URL (SSRF-guarded). Raises FetchSkipped, never fatal."""
    return fetch_url(url, timeout=timeout)


def evaluate_resource(
    gap: GapCard,
    candidate: SearchCandidate,
    excerpt: str = "",
    llm: LLMProvider | None = None,
) -> Evaluation:
    """Score a candidate. LLM when available, deterministic fallback otherwise."""
    if llm is not None and llm.available:
        try:
            return llm.evaluate(gap, candidate, excerpt)
        except ProviderError:
            pass
    return deterministic_evaluate(gap, candidate, excerpt)


@transaction.atomic
def build_study_plan(student, run, selections: list, start_date, target_date, llm=None):
    """Create an agent-origin study plan from evaluated selections.

    selections: [{gap: GapCard, resource: LearningResource, evaluation: Evaluation}]
    Writes go through the stage-2 item serializer so date/ordering/gap
    validation is identical to manual creation.
    """
    if not selections:
        raise AgentToolError("No evaluated resources to build a plan from.")
    subjects = sorted({s["gap"].subject for s in selections})
    plan = StudyPlan.objects.create(
        student=student,
        title=f"Personal plan: {', '.join(subjects)[:120]}",
        description=(
            f"Built by LearnBridge agent (run {run.id}) from "
            f"{len(selections)} evaluated resource(s)."
        ),
        start_date=start_date,
        target_date=target_date,
        origin="agent",
        agent_run=run,
    )
    window_days = max((target_date - start_date).days, 0)
    for index, sel in enumerate(selections):
        gap, resource, evaluation = sel["gap"], sel["resource"], sel["evaluation"]
        if llm is not None and llm.available:
            try:
                text = llm.draft_item_text(gap, resource.title)
            except ProviderError:
                text = template_item_text(gap, resource.title)
        else:
            text = template_item_text(gap, resource.title)
        scheduled = start_date + timedelta(
            days=min(index, window_days) if selections else 0
        )
        serializer = StudyPlanItemSerializer(
            data={
                "learning_gap": gap.gap_id,
                "resource": resource.id,
                "title": text["title"],
                "description": (
                    f"Addresses {gap.subject}/{gap.topic} "
                    f"(score {evaluation.score:.2f})."
                ),
                "rationale": text["rationale"],
                "scheduled_date": scheduled.isoformat(),
                "estimated_minutes": 30,
                "ordering": index + 1,
            },
            context={"study_plan": plan},
        )
        # Serializer has no request here; gap ownership was verified at inspect
        # time against the run's own student, so this is safe.
        serializer.is_valid(raise_exception=True)
        item = serializer.save(study_plan=plan)
        Progress.objects.get_or_create(
            student=student,
            study_plan_item=item,
            defaults={"status": "not_started", "completion_percentage": 0.0},
        )
    return plan


def update_progress_recommendation(student, plan_id: int) -> dict | None:
    """Recommend the next plan item from existing Progress rows. Deterministic."""
    try:
        plan = student.study_plans.prefetch_related("items").get(pk=plan_id)
    except StudyPlan.DoesNotExist as exc:
        raise OwnershipError(f"Study plan {plan_id} not available to this student.") from exc
    progress_by_item = {
        p.study_plan_item_id: p for p in Progress.objects.filter(student=student)
    }
    for item in sorted(plan.items.all(), key=lambda i: i.ordering):
        progress = progress_by_item.get(item.id)
        state = progress.status if progress else "not_started"
        if state != "completed":
            return {
                "next_item_id": item.id,
                "next_item_title": item.title,
                "reason": (
                    f"'{item.title}' is the earliest unfinished activity "
                    f"(status {state}) addressing "
                    f"{item.learning_gap.topic if item.learning_gap else 'general review'}."
                ),
            }
    return None


def generate_learning_report(student, run, plan, selections: list, llm=None):
    """Persist the evidence-backed report. Findings link gap → resource → items."""
    from apps.reports.models import LearningReport

    findings = []
    for sel in selections:
        gap, resource, evaluation = sel["gap"], sel["resource"], sel["evaluation"]
        item_ids = list(
            plan.items.filter(learning_gap_id=gap.gap_id).values_list("id", flat=True)
        )
        findings.append(
            {
                "gap_id": gap.gap_id,
                "subject": gap.subject,
                "topic": gap.topic,
                "severity": gap.severity,
                "evidence": gap.evidence,
                "wrong_count": gap.wrong_count,
                "resources": [
                    {
                        "resource_id": resource.id,
                        "title": resource.title,
                        "url": resource.url,
                        "score": evaluation.score,
                        "rationale": evaluation.rationale,
                    }
                ],
                "plan_item_ids": item_ids,
            }
        )
    if llm is not None and llm.available:
        try:
            summary = llm.summarize_report(len(selections), plan.title, findings)
        except ProviderError:
            summary = template_report_summary(len(selections), plan.title, findings)
    else:
        summary = template_report_summary(len(selections), plan.title, findings)
    return LearningReport.objects.create(
        student=student,
        agent_run=run,
        title=f"Learning report: {plan.title[:120]}",
        summary=summary,
        findings=findings,
    )
