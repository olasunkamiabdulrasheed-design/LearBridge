"""Learning gaps: private per-student weaknesses, assessment-derived initially."""
from django.db import models

from apps.users.models import StudentProfile


class GapSeverity(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"
    CRITICAL = "critical", "Critical"


class GapStatus(models.TextChoices):
    OPEN = "open", "Open"
    IN_PROGRESS = "in_progress", "In progress"
    RESOLVED = "resolved", "Resolved"


class GapSource(models.TextChoices):
    ASSESSMENT = "assessment", "Assessment"
    MANUAL = "manual", "Manual"
    AGENT = "agent", "Agent"


class LearningGap(models.Model):
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="gaps"
    )
    subject = models.CharField(max_length=100, db_index=True)
    topic = models.CharField(max_length=150, db_index=True)
    description = models.TextField(blank=True, default="")
    severity = models.CharField(
        max_length=10, choices=GapSeverity.choices, default=GapSeverity.MEDIUM
    )
    source = models.CharField(
        max_length=20, choices=GapSource.choices, default=GapSource.ASSESSMENT
    )
    evidence = models.TextField(
        blank=True, default="", help_text="Where this gap was observed (e.g. attempt reference)."
    )
    status = models.CharField(
        max_length=20, choices=GapStatus.choices, default=GapStatus.OPEN
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "subject", "topic"], name="unique_gap_per_student_topic"
            )
        ]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["student", "subject"]),
            models.Index(fields=["student", "severity"]),
        ]
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.subject} / {self.topic} ({self.severity})"
