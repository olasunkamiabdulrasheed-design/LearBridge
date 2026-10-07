"""Progress: per-student tracking of study-plan-item completion."""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.plans.models import StudyPlanItem
from apps.users.models import StudentProfile


class ProgressStatus(models.TextChoices):
    NOT_STARTED = "not_started", "Not started"
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"


class Progress(models.Model):
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="progress_entries"
    )
    study_plan_item = models.ForeignKey(
        StudyPlanItem, on_delete=models.CASCADE, related_name="progress_entries"
    )
    status = models.CharField(
        max_length=20, choices=ProgressStatus.choices, default=ProgressStatus.NOT_STARTED
    )
    completion_percentage = models.FloatField(
        default=0.0, validators=[MinValueValidator(0.0), MaxValueValidator(100.0)]
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["student", "study_plan_item"], name="unique_progress_per_item"
            )
        ]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["study_plan_item"]),
        ]

    def save(self, *args, **kwargs):
        if self.status == ProgressStatus.COMPLETED:
            if self.completed_at is None:
                self.completed_at = timezone.now()
            if self.completion_percentage < 100.0:
                self.completion_percentage = 100.0
        else:
            self.completed_at = None
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Progress(item={self.study_plan_item_id}, {self.completion_percentage}%)"
