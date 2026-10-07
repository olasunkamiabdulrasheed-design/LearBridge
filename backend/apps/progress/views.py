"""Progress: students track their own plan items; filterable by study plan."""
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.core.permissions import IsOwner

from .models import Progress
from .serializers import ProgressSerializer


class ProgressViewSet(viewsets.ModelViewSet):
    serializer_class = ProgressSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        qs = Progress.objects.select_related("study_plan_item__study_plan", "student")
        if self.request.user.is_staff:
            base = qs
        else:
            base = qs.filter(student=self.request.user.student_profile)
        params = self.request.query_params
        if params.get("study_plan"):
            base = base.filter(study_plan_item__study_plan_id=params["study_plan"].strip())
        if params.get("status"):
            base = base.filter(status=params["status"].strip())
        return base
