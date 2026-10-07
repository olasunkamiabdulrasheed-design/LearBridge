"""Study plans (+ nested items). Everything scoped to the owning student."""
from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsOwner, owner_user
from apps.progress.models import Progress

from .models import StudyPlan, StudyPlanItem
from .serializers import StudyPlanItemSerializer, StudyPlanSerializer


class StudyPlanViewSet(viewsets.ModelViewSet):
    serializer_class = StudyPlanSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = StudyPlan.objects.annotate(item_count=Count("items")).prefetch_related("items")
        if self.request.user.is_staff:
            base = qs
        else:
            base = qs.filter(student=self.request.user.student_profile)
        if self.request.query_params.get("status"):
            base = base.filter(status=self.request.query_params["status"].strip())
        return base

    def perform_create(self, serializer):
        if self.request.user.is_staff and "student" in serializer.validated_data:
            serializer.save()
        else:
            serializer.save(student=self.request.user.student_profile)

    @action(detail=True, methods=["get", "post"], url_path="items")
    def items(self, request, pk=None):
        plan = self.get_object()
        if request.method == "GET":
            qs = plan.items.all().order_by("ordering")
            page = self.paginate_queryset(qs)
            serializer = StudyPlanItemSerializer(page or qs, many=True)
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)
        serializer = StudyPlanItemSerializer(
            data=request.data, context={"request": request, "study_plan": plan}
        )
        serializer.is_valid(raise_exception=True)
        item = serializer.save(study_plan=plan)
        Progress.objects.get_or_create(
            student=plan.student,
            study_plan_item=item,
            defaults={"status": "not_started", "completion_percentage": 0.0},
        )
        return Response(StudyPlanItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=["get", "put", "patch", "delete"],
        url_path=r"items/(?P<item_pk>[^/.]+)",
    )
    def item_detail(self, request, pk=None, item_pk=None):
        plan = self.get_object()
        try:
            item = plan.items.get(pk=item_pk)
        except (StudyPlanItem.DoesNotExist, ValueError, TypeError):
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if owner_user(item) != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You do not have access to this object."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if request.method == "DELETE":
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        if request.method == "GET":
            return Response(StudyPlanItemSerializer(item).data)
        serializer = StudyPlanItemSerializer(
            item,
            data=request.data,
            partial=request.method == "PATCH",
            context={"request": request, "study_plan": plan},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
