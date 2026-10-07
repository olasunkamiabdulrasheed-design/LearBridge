"""Agent-run API: students start and inspect their own runs only."""
from datetime import date

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.agent.config import get_config
from apps.agent.orchestrator import run_agent
from apps.core.permissions import IsOwner

from .models import AgentRun, TERMINAL_STATUSES
from .serializers import AgentRunCreateSerializer, AgentRunSerializer


class AgentRunViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AgentRunSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = AgentRun.objects.select_related("student").prefetch_related("events")
        if self.request.user.is_staff:
            base = qs
        else:
            base = qs.filter(student=self.request.user.student_profile)
        if self.request.query_params.get("status"):
            base = base.filter(status=self.request.query_params["status"].strip())
        return base

    def create(self, request, *args, **kwargs):
        config = get_config()
        if not config.enabled:
            return Response(
                {"detail": "The agent is currently disabled."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        profile = request.user.student_profile
        if AgentRun.objects.filter(student=profile).exclude(
            status__in=list(TERMINAL_STATUSES)
        ).exists():
            return Response(
                {"detail": "An agent run is already active for this student."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AgentRunCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        input_context: dict = {"purpose": data["purpose"]}
        if data.get("gap_ids") is not None:
            input_context["gap_ids"] = data["gap_ids"]
        if data.get("plan_id"):
            input_context["plan_id"] = data["plan_id"]
        if data.get("target_date"):
            target = data["target_date"]
            if isinstance(target, date):
                target = target.isoformat()
            input_context["target_date"] = target
        run = AgentRun.objects.create(
            student=profile, purpose=data["purpose"], input_context=input_context
        )
        run_agent(run.id)  # inline execution (stage 3); queue-ready signature
        run.refresh_from_db()
        return Response(AgentRunSerializer(run).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        run = self.get_object()
        if run.status in TERMINAL_STATUSES:
            return Response(
                {"detail": "Run already finished."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        run.status = "cancelled"
        run.completed_at = timezone.now()
        run.save(update_fields=["status", "completed_at"])
        return Response(AgentRunSerializer(run).data, status=status.HTTP_200_OK)
