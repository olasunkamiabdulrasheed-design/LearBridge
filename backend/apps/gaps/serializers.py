"""Learning-gap serializers."""
from rest_framework import serializers

from .models import LearningGap


class LearningGapSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    student_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = LearningGap
        fields = [
            "id",
            "student",
            "student_id",
            "subject",
            "topic",
            "description",
            "severity",
            "source",
            "evidence",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "student", "created_at", "updated_at"]

    def create(self, validated_data):
        student_id = validated_data.pop("student_id", None)
        request = self.context.get("request")
        if student_id is not None:
            if not (request and request.user and request.user.is_staff):
                raise serializers.ValidationError(
                    {"student_id": "Only staff can assign a gap to a student."}
                )
            from apps.users.models import StudentProfile

            try:
                validated_data["student"] = StudentProfile.objects.get(pk=student_id)
            except StudentProfile.DoesNotExist:
                raise serializers.ValidationError({"student_id": "Unknown student."})
        elif request is not None:
            validated_data["student"] = request.user.student_profile
        return super().create(validated_data)
