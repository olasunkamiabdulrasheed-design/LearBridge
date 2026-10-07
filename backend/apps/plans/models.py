"""Study plans: a student's ordered path through gaps + resources."""
from django.core.validators import MinValueValidator
from django.db import models

from apps.gaps.models import LearningGap
from apps.resources.models import LearningResource
from apps.users.models import StudentProfile


class StudyPlanStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    PAUSED = "paused", "Paused"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class StudyPlanItemStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    IN_PROGRESS = "in_progress", "In progress"
    COMPLETED = "completed", "Completed"
    SKIPPED = "skipped", "Skipped"


class StudyPlan(models.Model):
    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="study_plans"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    start_date = models.DateField()
    target_date = models.DateField()
    status = models.CharField(
        max_length=20, choices=StudyPlanStatus.choices, default=StudyPlanStatus.ACTIVE
    )
    # Agent provenance (stage 3): which run built this plan, if any.
    origin = models.CharField(
        max_length=20,
        choices=[("manual", "Manual"), ("agent", "Agent")],
        default="manual",
    )
    agent_run = models.ForeignKey(
        "agent_runs.AgentRun",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="study_plans",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["student", "status"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title


class StudyPlanItem(models.Model):
    study_plan = models.ForeignKey(
        StudyPlan, on_delete=models.CASCADE, related_name="items"
    )
    learning_gap = models.ForeignKey(
        LearningGap,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plan_items",
    )
    resource = models.ForeignKey(
        LearningResource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="plan_items",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    # Why this activity addresses its gap — written by the agent, shown to students.
    rationale = models.TextField(blank=True, default="")
    scheduled_date = models.DateField(null=True, blank=True)
    estimated_minutes = models.PositiveIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1)]
    )
    status = models.CharField(
        max_length=20,
        choices=StudyPlanItemStatus.choices,
        default=StudyPlanItemStatus.PENDING,
    )
    ordering = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["study_plan", "ordering"], name="unique_plan_item_ordering"
            )
        ]
        indexes = [
            models.Index(fields=["study_plan", "status"]),
            models.Index(fields=["study_plan", "ordering"]),
        ]
        ordering = ["study_plan_id", "ordering"]

    def __str__(self) -> str:
        return f"{self.study_plan_id}#{self.ordering}: {self.title}"
