"""Seed a small demo catalog: one assessment + questions + resources.

Usage: python manage.py seed_demo
Idempotent — safe to run multiple times.
"""
from django.core.management.base import BaseCommand

from apps.assessments.models import Assessment, AssessmentStatus
from apps.questions.models import Difficulty, Question, QuestionType
from apps.resources.models import (
    LearningResource,
    ResourceDifficulty,
    ResourceType,
)


class Command(BaseCommand):
    help = "Seed demo assessment, questions, and resources."

    def handle(self, *args, **options):
        assessment, _ = Assessment.objects.get_or_create(
            title="Algebra Foundations Check",
            defaults={
                "description": "Short diagnostic covering linear equations and fractions.",
                "subject": "Mathematics",
                "education_level": "high",
                "status": AssessmentStatus.PUBLISHED,
            },
        )
        questions = [
            {
                "question_text": "Solve for x: 2x + 3 = 11.",
                "question_type": QuestionType.MULTIPLE_CHOICE,
                "options": {
                    "options": [
                        {"key": "A", "text": "x = 3"},
                        {"key": "B", "text": "x = 4"},
                        {"key": "C", "text": "x = 5"},
                    ]
                },
                "correct_answer": "B",
                "explanation": "2x = 8, so x = 4.",
                "difficulty": Difficulty.EASY,
                "topic": "linear equations",
                "ordering": 1,
            },
            {
                "question_text": "A fraction with numerator greater than denominator is improper. True or false?",
                "question_type": QuestionType.TRUE_FALSE,
                "options": None,
                "correct_answer": "true",
                "explanation": "That is the definition of an improper fraction.",
                "difficulty": Difficulty.EASY,
                "topic": "fractions",
                "ordering": 2,
            },
            {
                "question_text": "Simplify: (3/4) + (1/8). Write the answer as a fraction.",
                "question_type": QuestionType.SHORT_ANSWER,
                "options": None,
                "correct_answer": "7/8",
                "explanation": "3/4 = 6/8; 6/8 + 1/8 = 7/8.",
                "difficulty": Difficulty.MEDIUM,
                "topic": "fractions",
                "ordering": 3,
            },
        ]
        for q in questions:
            Question.objects.get_or_create(
                assessment=assessment, ordering=q["ordering"], defaults=q
            )
        resources = [
            {
                "title": "Linear equations walkthrough",
                "description": "Step-by-step intro to solving one-variable equations.",
                "url": "https://example.org/learn/linear-equations",
                "resource_type": ResourceType.VIDEO,
                "subject": "Mathematics",
                "topic": "linear equations",
                "difficulty": ResourceDifficulty.BEGINNER,
                "source_name": "Demo catalog",
                "is_verified": True,
            },
            {
                "title": "Fractions practice set",
                "description": "Guided practice on adding and simplifying fractions.",
                "url": "https://example.org/learn/fractions-practice",
                "resource_type": ResourceType.PRACTICE,
                "subject": "Mathematics",
                "topic": "fractions",
                "difficulty": ResourceDifficulty.BEGINNER,
                "source_name": "Demo catalog",
                "is_verified": False,
            },
        ]
        for r in resources:
            LearningResource.objects.get_or_create(title=r["title"], defaults=r)
        self.stdout.write(self.style.SUCCESS("Demo catalog seeded."))
