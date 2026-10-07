"""Assessment catalog + attempt workflow endpoints."""
from django.db.models import Count
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from apps.core.permissions import IsOwner
from apps.questions.serializers import (
    QuestionStaffSerializer,
    QuestionStudentSerializer,
)

from . import services
from .models import Assessment, AssessmentAttempt, AssessmentStatus, AttemptStatus
from .serializers import (
    AnswerSubmitSerializer,
    AssessmentDetailSerializer,
    AssessmentListSerializer,
    AttemptSerializer,
)


class AssessmentViewSet(viewsets.ModelViewSet):
    """Catalog: students list/retrieve published; staff manage everything."""

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAdminUser()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Assessment.objects.annotate(question_count=Count("questions"))
        if self.request.user.is_staff:
            return qs
        return qs.filter(status=AssessmentStatus.PUBLISHED)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AssessmentDetailSerializer
        return AssessmentListSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        subject = self.request.query_params.get("subject")
        if subject:
            queryset = queryset.filter(subject__iexact=subject.strip())
        level = self.request.query_params.get("education_level")
        if level:
            queryset = queryset.filter(education_level__iexact=level.strip())
        return queryset

    @action(detail=True, methods=["get"], url_path="questions")
    def questions(self, request, pk=None):
        assessment = self.get_object()
        qs = assessment.questions.all().order_by("ordering")
        serializer_cls = (
            QuestionStaffSerializer if request.user.is_staff else QuestionStudentSerializer
        )
        page = self.paginate_queryset(qs)
        if page is not None:
            return self.get_paginated_response(serializer_cls(page, many=True).data)
        return Response(serializer_cls(qs, many=True).data)

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request, pk=None):
        assessment = self.get_object()
        student = request.user.student_profile
        if AssessmentAttempt.objects.filter(
            student=student, assessment=assessment, status=AttemptStatus.IN_PROGRESS
        ).exists():
            return Response(
                {"detail": "An in-progress attempt already exists for this assessment."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        attempt = AssessmentAttempt.objects.create(student=student, assessment=assessment)
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


class AttemptViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Student-private attempts. Creation only via assessments/{id}/start/."""

    serializer_class = AttemptSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        qs = AssessmentAttempt.objects.select_related(
            "assessment", "student"
        ).prefetch_related("answers")
        if self.request.user.is_staff:
            return qs
        return qs.filter(student=self.request.user.student_profile)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        params = self.request.query_params
        if params.get("status"):
            queryset = queryset.filter(status=params["status"].strip())
        if params.get("assessment"):
            queryset = queryset.filter(assessment_id=params["assessment"].strip())
        return queryset

    @action(detail=True, methods=["post"], url_path="answers")
    def submit_answers(self, request, pk=None):
        attempt = self.get_object()
        if attempt.status != AttemptStatus.IN_PROGRESS:
            return Response(
                {"detail": "Answers can only be submitted to an in-progress attempt."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payload = request.data.get("answers", None)
        if not isinstance(payload, list) or not payload:
            return Response(
                {"detail": "Provide a non-empty 'answers' list."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AnswerSubmitSerializer(data=payload, many=True)
        serializer.is_valid(raise_exception=True)
        valid_ids = set(attempt.assessment.questions.values_list("id", flat=True))
        submitted = {item["question"]: item["answer"] for item in serializer.validated_data}
        unknown = set(submitted) - valid_ids
        if unknown:
            return Response(
                {"detail": f"Questions do not belong to this assessment: {sorted(unknown)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.questions.models import Question

        questions = Question.objects.in_bulk(submitted.keys())
        saved = []
        for qid, raw in submitted.items():
            answer, _ = attempt.answers.update_or_create(
                question_id=qid,
                defaults={
                    "answer": raw,
                    "is_correct": services.grade_answer(questions[qid], raw),
                },
            )
            saved.append(answer)
        from .serializers import AnswerSerializer

        return Response(AnswerSerializer(saved, many=True).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        attempt = self.get_object()
        try:
            attempt, gaps = services.complete_attempt(attempt)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = AttemptSerializer(attempt).data
        data["gaps_created"] = len(gaps)
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="result")
    def result(self, request, pk=None):
        attempt = self.get_object()
        return Response(AttemptSerializer(attempt).data, status=status.HTTP_200_OK)
