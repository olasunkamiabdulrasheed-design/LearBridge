"""Progress serializers."""
from rest_framework import serializers

from .models import Progress


class ProgressSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    study_plan = serializers.PrimaryKeyRelatedField(
        source="study_plan_item.study_plan", read_only=True
    )

    class Meta:
        model = Progress
        fields = [
            "id",
            "student",
            "study_plan_item",
            "study_plan",
            "status",
            "completion_percentage",
            "completed_at",
            "notes",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "completed_at", "updated_at"]
        extra_kwargs = {"study_plan_item": {"required": True}}

    def validate(self, attrs):
        request = self.context.get("request")
        item = attrs.get("study_plan_item", getattr(self.instance, "study_plan_item", None))
        if (
            self.instance is None
            and item is not None
            and request is not None
            and not request.user.is_staff
            and item.study_plan.student_id != request.user.student_profile.id
        ):
            raise serializers.ValidationError(
                {"study_plan_item": "Item does not belong to the current student."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request is not None and "student" not in validated_data:
            validated_data["student"] = request.user.student_profile
        return super().create(validated_data)
