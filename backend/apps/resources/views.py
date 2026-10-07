"""Resources: public catalog — any authenticated user reads; staff curate."""
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from .models import LearningResource
from .serializers import LearningResourceSerializer


class LearningResourceViewSet(viewsets.ModelViewSet):
    serializer_class = LearningResourceSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = LearningResource.objects.all()
        params = self.request.query_params
        if params.get("subject"):
            qs = qs.filter(subject__iexact=params["subject"].strip())
        if params.get("topic"):
            qs = qs.filter(topic__iexact=params["topic"].strip())
        if params.get("difficulty"):
            qs = qs.filter(difficulty=params["difficulty"].strip())
        if params.get("resource_type"):
            qs = qs.filter(resource_type=params["resource_type"].strip())
        return qs
