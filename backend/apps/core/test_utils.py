"""Shared test factories for the LearnBridge API test suite."""
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.assessments.models import Assessment, AssessmentStatus
from apps.questions.models import Question

User = get_user_model()


def make_user(username, password="testpass123", **kwargs):
    kwargs.setdefault("email", f"{username}@example.com")
    return User.objects.create_user(username=username, password=password, **kwargs)


def auth_client(user):
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
    return client


def make_assessment(subject="Mathematics", status=AssessmentStatus.PUBLISHED, **kwargs):
    defaults = {
        "title": f"{subject} diagnostic",
        "description": "Test assessment.",
        "education_level": "high",
    }
    defaults.update(kwargs)
    return Assessment.objects.create(subject=subject, status=status, **defaults)


def make_question(
    assessment,
    ordering=1,
    topic="linear equations",
    correct="B",
    question_type="multiple_choice",
    text=None,
    **kwargs,
):
    defaults = {
        "question_text": text or f"Question {ordering}?",
        "question_type": question_type,
        "correct_answer": correct,
        "topic": topic,
        "ordering": ordering,
    }
    defaults.update(kwargs)
    return Question.objects.create(assessment=assessment, **defaults)
