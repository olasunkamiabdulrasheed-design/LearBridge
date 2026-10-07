"""Assessment catalog + student attempt workflow models."""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.questions.models import Question
from apps.users.models import StudentProfile


class AssessmentStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"
    ABANDONED = "abandoned", "Abandoned"


class Assessment(models.Model):
    """Public catalog object: students can list/retrieve published ones."""

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    subject = models.CharField(max_length=100, db_index=True)
    education_level = models.CharField(max_length=20, blank=True, default="")
    status = models.CharField(
        max_length=20, choices=AssessmentStatus.choices, default=AssessmentStatus.DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["subject", "status"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class AssessmentAttempt(models.Model):
    """Private: one student's run through an assessment."""

    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="attempts"
    )
    assessment = models.ForeignKey(
        Assessment, on_delete=models.CASCADE, related_name="attempts"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=AttemptStatus.choices, default=AttemptStatus.IN_PROGRESS
    )
    score = models.PositiveIntegerField(default=0)
    percentage = models.FloatField(
        default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )

    class Meta:
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["assessment", "status"]),
        ]
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"Attempt(student={self.student_id}, assessment={self.assessment_id})"


class Answer(models.Model):
    """Private: a student's answer to one question within an attempt."""

    attempt = models.ForeignKey(
        AssessmentAttempt, on_delete=models.CASCADE, related_name="answers"
    )
    question = models.ForeignKey(
        Question, on_delete=models.CASCADE, related_name="answers"
    )
    answer = models.TextField()
    is_correct = models.BooleanField(default=False)
    answered_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["attempt", "question"], name="unique_answer_per_attempt_question"
            )
        ]
        indexes = [models.Index(fields=["attempt"])]

    def __str__(self) -> str:
        return f"Answer(attempt={self.attempt_id}, question={self.question_id})"
