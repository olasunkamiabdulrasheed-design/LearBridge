"""Learning-report serializers (read-only for students)."""
from rest_framework import serializers

from .models import LearningReport


class LearningReportSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LearningReport
        fields = [
            "id", "student", "agent_run", "title", "summary",
            "findings", "created_at",
        ]
        read_only_fields = fields
