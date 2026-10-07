"""Learning-resource serializers."""
from rest_framework import serializers

from .models import LearningResource


class LearningResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningResource
        fields = [
            "id",
            "title",
            "description",
            "url",
            "resource_type",
            "subject",
            "topic",
            "difficulty",
            "source_name",
            "is_verified",
            "origin",
            "quality_score",
            "quality_notes",
            "last_evaluated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
