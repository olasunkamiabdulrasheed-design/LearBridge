"""Learning reports: students read their own; creation happens via agent runs."""
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsOwner

from .models import LearningReport
from .serializers import LearningReportSerializer


class LearningReportViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = LearningReportSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = LearningReport.objects.select_related("student", "agent_run")
        if self.request.user.is_staff:
            return qs
        return qs.filter(student=self.request.user.student_profile)
