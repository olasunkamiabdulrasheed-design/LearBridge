"""Evidence-backed learning recommendations produced by agent runs."""
from django.db import models

from apps.agent_runs.models import AgentRun
from apps.users.models import StudentProfile


class LearningReport(models.Model):
    """Per-student report linking gaps → evidence → resources → plan."""

    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="learning_reports"
    )
    agent_run = models.OneToOneField(
        AgentRun, on_delete=models.CASCADE, related_name="report"
    )
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, default="")
    # Findings: [{gap_id, subject, topic, severity, evidence,
    #             resources: [{resource_id, title, rationale}], plan_item_ids: [...]}]
    findings = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["student", "-created_at"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"LearningReport({self.id}, student={self.student_id})"
