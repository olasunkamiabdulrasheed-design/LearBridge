"""Question bank: questions belong to one assessment each."""
from django.db import models


class QuestionType(models.TextChoices):
    MULTIPLE_CHOICE = "multiple_choice", "Multiple choice"
    TRUE_FALSE = "true_false", "True / false"
    SHORT_ANSWER = "short_answer", "Short answer"


class Difficulty(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class Question(models.Model):
    assessment = models.ForeignKey(
        "assessments.Assessment", on_delete=models.CASCADE, related_name="questions"
    )
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=20, choices=QuestionType.choices, default=QuestionType.MULTIPLE_CHOICE
    )
    # For multiple_choice: {"options": [{"key": "A", "text": "..."}, ...]}.
    options = models.JSONField(null=True, blank=True)
    # Canonical correct response used by server-side grading.
    correct_answer = models.TextField(blank=True, default="")
    explanation = models.TextField(blank=True, default="")
    difficulty = models.CharField(
        max_length=10, choices=Difficulty.choices, default=Difficulty.MEDIUM
    )
    # Denormalized topic label used to derive learning gaps from wrong answers.
    topic = models.CharField(max_length=150, blank=True, default="", db_index=True)
    ordering = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["assessment", "ordering"], name="unique_question_ordering"
            )
        ]
        indexes = [
            models.Index(fields=["assessment", "ordering"]),
            models.Index(fields=["difficulty"]),
        ]
        ordering = ["assessment_id", "ordering"]

    def __str__(self) -> str:
        return f"Q{self.ordering}: {self.question_text[:60]}"
