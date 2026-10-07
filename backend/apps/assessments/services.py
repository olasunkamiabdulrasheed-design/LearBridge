"""Attempt grading + assessment-derived learning-gap creation.

Deterministic rules only — no AI reasoning here (stage 3 owns that).
"""
from django.db import transaction
from django.utils import timezone

from apps.gaps.models import GapSeverity, GapSource, GapStatus, LearningGap

from .models import AssessmentAttempt, AttemptStatus


def normalize_answer(value) -> str:
    return str(value or "").strip().casefold()


def grade_answer(question, raw_answer: str) -> bool:
    """Server-side grading: normalized exact match against the stored key."""
    expected = normalize_answer(question.correct_answer)
    if not expected:
        return False
    return normalize_answer(raw_answer) == expected


def severity_for_percentage(percentage: float) -> str:
    if percentage < 50.0:
        return GapSeverity.HIGH
    if percentage < 80.0:
        return GapSeverity.MEDIUM
    return GapSeverity.LOW


@transaction.atomic
def complete_attempt(attempt: AssessmentAttempt):
    """Grade all answers, finalize score, derive gaps. Returns (attempt, gaps)."""
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise ValueError("Only in-progress attempts can be completed.")

    answers = attempt.answers.select_related("question").all()
    total = attempt.assessment.questions.count()
    correct = 0
    for answer in answers:
        answer.is_correct = grade_answer(answer.question, answer.answer)
        answer.save(update_fields=["is_correct", "answered_at"])
        if answer.is_correct:
            correct += 1

    attempt.score = correct
    attempt.percentage = round((correct / total * 100.0) if total else 0.0, 2)
    attempt.status = AttemptStatus.COMPLETED
    attempt.completed_at = timezone.now()
    attempt.save(update_fields=["score", "percentage", "status", "completed_at"])

    gaps = derive_gaps_for_attempt(attempt)
    return attempt, gaps


def derive_gaps_for_attempt(attempt: AssessmentAttempt):
    """Create (or refresh) one gap per topic answered incorrectly."""
    gaps = []
    assessment = attempt.assessment
    severity = severity_for_percentage(attempt.percentage)
    wrong = attempt.answers.select_related("question").filter(is_correct=False)
    for answer in wrong:
        topic = (answer.question.topic or "").strip() or "general"
        gap, created = LearningGap.objects.get_or_create(
            student=attempt.student,
            subject=assessment.subject,
            topic=topic,
            defaults={
                "description": f"Missed {answer.question.question_type} question(s) on '{topic}'.",
                "severity": severity,
                "source": GapSource.ASSESSMENT,
                "evidence": (
                    f"Attempt {attempt.id} on '{assessment.title}': "
                    f"scored {attempt.score} "
                    f"({attempt.percentage}%)."
                ),
                "status": GapStatus.OPEN,
            },
        )
        if not created:
            gap.severity = severity
            gap.evidence = (
                f"Attempt {attempt.id} on '{assessment.title}': "
                f"scored {attempt.score} ({attempt.percentage}%)."
            )
            if gap.status == GapStatus.RESOLVED:
                gap.status = GapStatus.OPEN
            gap.save(update_fields=["severity", "evidence", "status", "updated_at"])
        gaps.append(gap)
    return gaps
