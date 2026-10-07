"""Curated learning resources (public catalog, staff-curated)."""
from django.db import models


class ResourceType(models.TextChoices):
    VIDEO = "video", "Video"
    ARTICLE = "article", "Article"
    BOOK = "book", "Book"
    COURSE = "course", "Course"
    PRACTICE = "practice", "Practice set"
    INTERACTIVE = "interactive", "Interactive"
    OTHER = "other", "Other"


class ResourceDifficulty(models.TextChoices):
    BEGINNER = "beginner", "Beginner"
    INTERMEDIATE = "intermediate", "Intermediate"
    ADVANCED = "advanced", "Advanced"


class LearningResource(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    url = models.URLField(max_length=2000)
    resource_type = models.CharField(
        max_length=20, choices=ResourceType.choices, default=ResourceType.ARTICLE
    )
    subject = models.CharField(max_length=100, db_index=True)
    topic = models.CharField(max_length=150, blank=True, default="", db_index=True)
    difficulty = models.CharField(
        max_length=20, choices=ResourceDifficulty.choices, default=ResourceDifficulty.BEGINNER
    )
    source_name = models.CharField(max_length=255, blank=True, default="")
    is_verified = models.BooleanField(default=False)
    # Agent provenance + quality (stage 3). Catalog rows keep origin="catalog".
    origin = models.CharField(
        max_length=20,
        choices=[("catalog", "Catalog"), ("web", "Web"), ("suggested", "Suggested")],
        default="catalog",
    )
    quality_score = models.FloatField(null=True, blank=True)
    quality_notes = models.TextField(blank=True, default="")
    last_evaluated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["subject", "topic"]),
            models.Index(fields=["difficulty"]),
            models.Index(fields=["resource_type"]),
        ]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title
