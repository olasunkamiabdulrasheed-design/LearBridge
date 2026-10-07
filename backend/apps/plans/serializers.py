"""Study-plan + plan-item serializers with date/ownership validation."""
from rest_framework import serializers

from apps.gaps.models import LearningGap
from apps.resources.models import LearningResource

from .models import StudyPlan, StudyPlanItem


class StudyPlanItemSerializer(serializers.ModelSerializer):
    learning_gap = serializers.PrimaryKeyRelatedField(
        queryset=LearningGap.objects.all(), required=False, allow_null=True
    )
    resource = serializers.PrimaryKeyRelatedField(
        queryset=LearningResource.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = StudyPlanItem
        fields = [
            "id",
            "study_plan",
            "learning_gap",
            "resource",
            "title",
            "description",
            "rationale",
            "scheduled_date",
            "estimated_minutes",
            "status",
            "ordering",
        ]
        read_only_fields = ["id", "study_plan"]

    def validate(self, attrs):
        request = self.context.get("request")
        plan = self.context.get("study_plan") or getattr(self.instance, "study_plan", None)
        gap = attrs.get("learning_gap", getattr(self.instance, "learning_gap", None))
        if gap is not None and request is not None and not request.user.is_staff:
            if gap.student_id != request.user.student_profile.id:
                raise serializers.ValidationError(
                    {"learning_gap": "Gap does not belong to the current student."}
                )
        scheduled = attrs.get("scheduled_date", getattr(self.instance, "scheduled_date", None))
        if scheduled is not None and plan is not None:
            if scheduled < plan.start_date or scheduled > plan.target_date:
                raise serializers.ValidationError(
                    {"scheduled_date": "Must fall within the plan's start/target dates."}
                )
        ordering = attrs.get("ordering", getattr(self.instance, "ordering", None))
        if plan is not None and ordering is not None:
            qs = StudyPlanItem.objects.filter(study_plan=plan, ordering=ordering)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"ordering": "This ordering is already used in the plan."}
                )
        return attrs


class StudyPlanSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    items = StudyPlanItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = StudyPlan
        fields = [
            "id",
            "student",
            "title",
            "description",
            "start_date",
            "target_date",
            "status",
            "origin",
            "agent_run",
            "item_count",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "origin", "agent_run", "created_at", "updated_at"]

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        target = attrs.get("target_date", getattr(self.instance, "target_date", None))
        if start is not None and target is not None and target < start:
            raise serializers.ValidationError(
                {"target_date": "Target date must be on or after the start date."}
            )
        return attrs
