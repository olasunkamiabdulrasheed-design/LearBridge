"""Fixed-pipeline agent orchestration with inline execution.

Pipeline: inspect gaps → research resources → evaluate → build plan →
write report. Each step appends a concise AgentEvent (summary + structured
payload). Raw prompts, page text, and model internals are never persisted.

Entry point run_agent(run_id) is queue-ready: it takes only a run PK.
"""
from datetime import timedelta

from django.db.models import Max
from django.utils import timezone

from apps.agent_runs.models import (
    AgentEvent,
    AgentEventKind,
    AgentRun,
    AgentRunPurpose,
    AgentRunStatus,
    TERMINAL_STATUSES,
)
from apps.resources.models import LearningResource

from . import tools
from .config import AgentConfig, get_config, per_call_timeout
from .fetch import FetchSkipped
from .providers.base import LLMProvider, ProviderError, SearchProvider
from .providers.factory import get_llm_provider, get_search_provider
from .providers.local import CatalogSearchProvider, difficulty_for_level


class StepBudgetExceeded(tools.AgentToolError):
    pass


class _Runner:
    def __init__(self, run, config, search, llm):
        self.run = run
        self.student = run.student
        self.config = config
        self.search = search
        self.llm = llm
        self.steps = 0
        self.step_name = "init"
        last = AgentEvent.objects.filter(run=run).aggregate(Max("seq"))["seq__max"] or 0
        self.seq = last

    def log(self, kind, summary, payload=None):
        self.seq += 1
        return AgentEvent.objects.create(
            run=self.run, seq=self.seq, kind=kind,
            summary=summary, payload=payload or {},
        )

    def tool(self, name, func, *args, **kwargs):
        self.steps += 1
        if self.steps > self.config.max_steps:
            raise StepBudgetExceeded(f"Step budget exceeded at '{name}'.")
        self.step_name = name
        return func(*args, **kwargs)

    def finalize(self, status, result=None, error=None):
        self.run.status = status
        self.run.completed_at = timezone.now()
        if result is not None:
            self.run.result = result
        if error is not None:
            self.run.error = error
        self.run.save(update_fields=["status", "completed_at", "result", "error"])


def _ensure_resource_row(student, candidate, evaluation) -> LearningResource:
    """Catalog candidates already exist; web candidates are stored with provenance."""
    if candidate.origin == "catalog" and candidate.resource_id:
        resource = LearningResource.objects.get(pk=candidate.resource_id)
        resource.quality_score = evaluation.score
        resource.quality_notes = evaluation.rationale[:1000]
        resource.last_evaluated_at = timezone.now()
        resource.save(
            update_fields=["quality_score", "quality_notes", "last_evaluated_at", "updated_at"]
        )
        return resource
    resource, _ = LearningResource.objects.get_or_create(
        url=candidate.url,
        defaults={
            "title": candidate.title[:255],
            "description": candidate.snippet[:2000],
            "subject": "",
            "topic": "",
            "source_name": candidate.source_name or "Web",
            "origin": "web",
        },
    )
    resource.quality_score = evaluation.score
    resource.quality_notes = evaluation.rationale[:1000]
    resource.last_evaluated_at = timezone.now()
    resource.save(
        update_fields=["quality_score", "quality_notes", "last_evaluated_at", "updated_at"]
    )
    return resource


def _remediate(runner: _Runner, gap_ids, target_date):
    student, config = runner.student, runner.config
    level = student.education_level or ""

    gaps = runner.tool(
        "inspect_learning_gaps", tools.inspect_learning_gaps, student, gap_ids
    )
    runner.log(
        AgentEventKind.GAPS_EXAMINED,
        f"Examined {len(gaps)} learning gap(s): "
        + (", ".join(f"{g.subject}/{g.topic}" for g in gaps[:5]) or "none"),
        {"gap_ids": [g.gap_id for g in gaps]},
    )
    if not gaps:
        return {"message": "No open learning gaps to address.", "plan_id": None, "report_id": None}

    selections = []
    searched_providers = set()
    used_fallback_search = False
    for gap in gaps[: config.max_gaps_per_run]:
        try:
            candidates = runner.tool(
                "search_learning_resources",
                tools.search_learning_resources,
                gap.subject, gap.topic, level,
                config.candidates_per_gap, runner.search,
            )
            searched_providers.add(runner.search.name)
        except tools.AgentToolError:
            candidates = CatalogSearchProvider().search(
                gap.subject, gap.topic, level, config.candidates_per_gap
            )
            used_fallback_search = True
        evaluated = []
        for candidate in candidates:
            excerpt = ""
            if candidate.origin == "web" and len(evaluated) < config.fetch_per_gap:
                try:
                    fetched = runner.tool(
                        "fetch_resource", tools.fetch_resource,
                        candidate.url, per_call_timeout(config),
                    )
                    excerpt = fetched.excerpt
                except FetchSkipped as exc:
                    runner.log(
                        AgentEventKind.NOTE,
                        f"Skipped {candidate.url}: {exc}",
                        {"gap_id": gap.gap_id, "url": candidate.url},
                    )
                    continue
            evaluation = runner.tool(
                "evaluate_resource", tools.evaluate_resource,
                gap, candidate, excerpt, runner.llm,
            )
            evaluated.append((candidate, evaluation, excerpt))
        evaluated.sort(key=lambda t: t[1].score, reverse=True)
        for candidate, evaluation, _excerpt in evaluated[: config.keep_per_gap]:
            resource = _ensure_resource_row(student, candidate, evaluation)
            if not resource.subject:
                resource.subject = gap.subject
            if not resource.topic:
                resource.topic = gap.topic
            if resource.difficulty == "beginner" or not resource.difficulty:
                resource.difficulty = difficulty_for_level(level)
            resource.save(update_fields=["subject", "topic", "difficulty", "updated_at"])
            selections.append(
                {"gap": gap, "resource": resource, "evaluation": evaluation}
            )
    runner.log(
        AgentEventKind.RESOURCES_SEARCHED,
        f"Researched {len(gaps[:config.max_gaps_per_run])} gap(s) via "
        f"{', '.join(sorted(searched_providers)) or 'catalog'}"
        + (" (catalog fallback used)" if used_fallback_search else "")
        + f"; kept {len(selections)} resource(s).",
        {
            "providers": sorted(searched_providers),
            "fallback_search": used_fallback_search,
            "kept": [
                {"gap_id": s["gap"].gap_id, "resource_id": s["resource"].id,
                 "score": s["evaluation"].score}
                for s in selections
            ],
        },
    )
    if not selections:
        return {"message": "No suitable resources found.", "plan_id": None, "report_id": None}
    runner.log(
        AgentEventKind.RESOURCES_EVALUATED,
        "Evaluated candidates and kept: "
        + ", ".join(f"'{s['resource'].title[:50]}' ({s['evaluation'].score:.2f})" for s in selections),
        {"llm": bool(runner.llm and runner.llm.available)},
    )

    start = timezone.localdate()
    plan = runner.tool(
        "build_study_plan", tools.build_study_plan,
        student, runner.run, selections, start, target_date or (start + timedelta(days=14)),
        runner.llm,
    )
    runner.log(
        AgentEventKind.PLAN_BUILT,
        f"Built study plan '{plan.title}' with {plan.items.count()} activit(ies).",
        {"plan_id": plan.id, "item_ids": list(plan.items.values_list("id", flat=True))},
    )
    report = runner.tool(
        "generate_learning_report", tools.generate_learning_report,
        student, runner.run, plan, selections, runner.llm,
    )
    runner.log(
        AgentEventKind.REPORT_WRITTEN,
        f"Wrote learning report '{report.title}'.",
        {"report_id": report.id},
    )
    return {
        "plan_id": plan.id,
        "report_id": report.id,
        "gaps_addressed": [g.gap_id for g in gaps[: config.max_gaps_per_run]],
        "resources_selected": [s["resource"].id for s in selections],
    }


def _refresh(runner: _Runner, plan_id):
    gaps = runner.tool("inspect_learning_gaps", tools.inspect_learning_gaps, runner.student, None)
    runner.log(
        AgentEventKind.GAPS_EXAMINED,
        f"Examined {len(gaps)} open gap(s) for context.",
        {"gap_ids": [g.gap_id for g in gaps]},
    )
    if plan_id is None:
        raise tools.AgentToolError("refresh_plan requires input_context.plan_id.")
    recommendation = runner.tool(
        "update_progress_recommendation",
        tools.update_progress_recommendation, runner.student, plan_id,
    )
    runner.log(
        AgentEventKind.NOTE,
        recommendation["reason"] if recommendation else "Plan already complete.",
        {"recommendation": recommendation},
    )
    return {"plan_id": plan_id, "recommendation": recommendation}


def run_agent(run_id: int, config: AgentConfig | None = None,
              search: SearchProvider | None = None,
              llm: LLMProvider | None = None) -> AgentRun:
    """Execute the fixed pipeline inline. Never raises: failures are recorded."""
    config = config or get_config()
    run = AgentRun.objects.select_related("student").get(pk=run_id)
    runner = _Runner(
        run, config,
        search or get_search_provider(config),
        llm if llm is not None else get_llm_provider(config),
    )
    if run.status in TERMINAL_STATUSES:
        return run
    if not config.enabled:
        runner.finalize(AgentRunStatus.FAILED, error={"step": "init", "message": "Agent disabled."})
        return run
    run.status = AgentRunStatus.RUNNING
    run.save(update_fields=["status"])
    runner.log(
        AgentEventKind.STARTED,
        f"Agent started: {run.purpose} for {run.student.user.username}.",
        {"purpose": run.purpose, "input": run.input_context},
    )
    try:
        context = run.input_context or {}
        if run.purpose == AgentRunPurpose.REFRESH_PLAN:
            result = _refresh(runner, context.get("plan_id"))
        else:
            target = None
            if context.get("target_date"):
                from datetime import date
                target = date.fromisoformat(context["target_date"])
            result = _remediate(runner, context.get("gap_ids"), target)
        runner.log(AgentEventKind.COMPLETED, "Agent completed.", {"result": result})
        runner.finalize(AgentRunStatus.SUCCEEDED, result=result)
    except tools.AgentToolError as exc:
        runner.log(AgentEventKind.FAILED, f"Agent failed at '{runner.step_name}': {exc}", {})
        runner.finalize(
            AgentRunStatus.FAILED,
            error={"step": runner.step_name, "message": str(exc)[:500]},
        )
    except Exception as exc:  # defensive: inline execution must return a response
        runner.log(AgentEventKind.FAILED, f"Agent failed at '{runner.step_name}': unexpected error.", {})
        runner.finalize(
            AgentRunStatus.FAILED,
            error={"step": runner.step_name, "message": f"Unexpected {type(exc).__name__}"},
        )
    return run
