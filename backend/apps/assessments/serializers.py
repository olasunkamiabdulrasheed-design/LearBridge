"""Serializers for the assessment catalog and attempt workflow."""
from rest_framework import serializers

from apps.questions.serializers import (
    QuestionStaffSerializer,
    QuestionStudentSerializer,
)

from .models import Answer, Assessment, AssessmentAttempt


class AssessmentListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Assessment
        fields = [
            "id",
            "title",
            "description",
            "subject",
            "education_level",
            "status",
            "question_count",
            "created_at",
            "updated_at",
        ]


class AssessmentDetailSerializer(AssessmentListSerializer):
    questions = serializers.SerializerMethodField()

    class Meta(AssessmentListSerializer.Meta):
        fields = AssessmentListSerializer.Meta.fields + ["questions"]

    def get_questions(self, obj):
        request = self.context.get("request")
        is_staff = bool(request and request.user and request.user.is_staff)
        serializer_cls = QuestionStaffSerializer if is_staff else QuestionStudentSerializer
        return serializer_cls(obj.questions.all().order_by("ordering"), many=True).data


class AnswerSubmitSerializer(serializers.Serializer):
    question = serializers.IntegerField()
    answer = serializers.CharField(allow_blank=True)


class AnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Answer
        fields = ["id", "question", "answer", "is_correct", "answered_at"]
        read_only_fields = ["id", "is_correct", "answered_at"]


class AttemptSerializer(serializers.ModelSerializer):
    assessment_title = serializers.CharField(source="assessment.title", read_only=True)
    answers = AnswerSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = AssessmentAttempt
        fields = [
            "id",
            "assessment",
            "assessment_title",
            "status",
            "score",
            "percentage",
            "started_at",
            "completed_at",
            "question_count",
            "answers",
        ]
        read_only_fields = fields

    def get_question_count(self, obj):
        return obj.assessment.questions.count()
