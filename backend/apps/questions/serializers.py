"""Question serializers.

Students never receive ``correct_answer`` or ``explanation`` through the
taking flow — grading happens server-side. Staff receive full detail.
"""
from rest_framework import serializers

from .models import Question


class QuestionStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "assessment",
            "question_text",
            "question_type",
            "options",
            "difficulty",
            "topic",
            "ordering",
        ]
        read_only_fields = fields


class QuestionStaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            "id",
            "assessment",
            "question_text",
            "question_type",
            "options",
            "correct_answer",
            "explanation",
            "difficulty",
            "topic",
            "ordering",
        ]
