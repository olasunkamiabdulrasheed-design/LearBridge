"""Learning gaps: students read/update their own; staff manage all."""
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from apps.core.permissions import IsOwner

from .models import LearningGap
from .serializers import LearningGapSerializer


class LearningGapViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = LearningGapSerializer

    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAdminUser()]
        return [IsAuthenticated(), IsOwner()]

    def get_queryset(self):
        qs = LearningGap.objects.select_related("student")
        if self.request.user.is_staff:
            base = qs
        else:
            base = qs.filter(student=self.request.user.student_profile)
        params = self.request.query_params
        if params.get("subject"):
            base = base.filter(subject__iexact=params["subject"].strip())
        if params.get("status"):
            base = base.filter(status=params["status"].strip())
        if params.get("severity"):
            base = base.filter(severity=params["severity"].strip())
        return base

    def perform_create(self, serializer):
        # Staff create gaps against a given student profile id.
        serializer.save()
