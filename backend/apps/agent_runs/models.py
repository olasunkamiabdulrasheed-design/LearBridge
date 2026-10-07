"""Agent run persistence: observable, evidence-linked, no chain-of-thought stored.

An AgentRun records what the agent did (concise event summaries + structured
payloads of IDs/scores). Raw prompts, fetched page text, and model internals
are never persisted — see apps/agent/ for the execution engine.
"""
from django.db import models

from apps.users.models import StudentProfile


class AgentRunPurpose(models.TextChoices):
    REMEDIATE_GAPS = "remediate_gaps", "Remediate gaps"
    REFRESH_PLAN = "refresh_plan", "Refresh plan"


class AgentRunStatus(models.TextChoices):
    QUEUED = "queued", "Queued"
    RUNNING = "running", "Running"
    SUCCEEDED = "succeeded", "Succeeded"
    FAILED = "failed", "Failed"
    CANCELLED = "cancelled", "Cancelled"


TERMINAL_STATUSES = {AgentRunStatus.SUCCEEDED, AgentRunStatus.FAILED, AgentRunStatus.CANCELLED}


class AgentRun(models.Model):
    """One student's agent execution. Always owned by exactly one student."""

    student = models.ForeignKey(
        StudentProfile, on_delete=models.CASCADE, related_name="agent_runs"
    )
    purpose = models.CharField(
        max_length=20, choices=AgentRunPurpose.choices, default=AgentRunPurpose.REMEDIATE_GAPS
    )
    status = models.CharField(
        max_length=20, choices=AgentRunStatus.choices, default=AgentRunStatus.QUEUED
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # What the run was asked to do: gap IDs, options. Never other students' data.
    input_context = models.JSONField(default=dict, blank=True)
    # Outcome: plan/report IDs, counts. Links, not prose dumps.
    result = models.JSONField(default=dict, blank=True)
    # Failure info: {"step": ..., "message": ...}. No tracebacks/secrets.
    error = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["student", "-started_at"]),
        ]
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"AgentRun({self.id}, student={self.student_id}, {self.status})"


class AgentEventKind(models.TextChoices):
    STARTED = "started", "Started"
    GAPS_EXAMINED = "gaps_examined", "Gaps examined"
    RESOURCES_SEARCHED = "resources_searched", "Resources searched"
    RESOURCES_EVALUATED = "resources_evaluated", "Resources evaluated"
    PLAN_BUILT = "plan_built", "Plan built"
    REPORT_WRITTEN = "report_written", "Report written"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
    NOTE = "note", "Note"


class AgentEvent(models.Model):
    """One observable step summary within a run. Concise summaries only."""

    run = models.ForeignKey(AgentRun, on_delete=models.CASCADE, related_name="events")
    seq = models.PositiveIntegerField()
    kind = models.CharField(max_length=30, choices=AgentEventKind.choices)
    summary = models.TextField()
    # Structured payload: IDs, scores, counts. No prompts or page text.
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["run", "seq"], name="unique_event_seq_per_run")
        ]
        indexes = [models.Index(fields=["run", "seq"])]
        ordering = ["run_id", "seq"]

    def __str__(self) -> str:
        return f"AgentEvent(run={self.run_id}, seq={self.seq}, {self.kind})"
