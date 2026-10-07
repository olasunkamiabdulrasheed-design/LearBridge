"""Student/user domain: Django auth User + one StudentProfile per user."""
from django.conf import settings
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class EducationLevel(models.TextChoices):
    ELEMENTARY = "elementary", "Elementary"
    MIDDLE = "middle", "Middle school"
    HIGH = "high", "High school"
    UNDERGRADUATE = "undergraduate", "Undergraduate"
    GRADUATE = "graduate", "Graduate"
    PROFESSIONAL = "professional", "Professional"
    OTHER = "other", "Other"


class LearningStyle(models.TextChoices):
    VISUAL = "visual", "Visual"
    AUDITORY = "auditory", "Auditory"
    READING = "reading", "Reading / writing"
    KINESTHETIC = "kinesthetic", "Kinesthetic"
    MULTIMODAL = "multimodal", "Multimodal"


class StudentProfile(models.Model):
    """Extended learner record. Auth stays on Django's User model."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_profile"
    )
    education_level = models.CharField(
        max_length=20, choices=EducationLevel.choices, default=EducationLevel.OTHER
    )
    institution = models.CharField(max_length=255, blank=True, default="")
    field_of_study = models.CharField(max_length=255, blank=True, default="")
    preferred_learning_style = models.CharField(
        max_length=20, choices=LearningStyle.choices, blank=True, default=""
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [models.Index(fields=["education_level"])]

    def __str__(self) -> str:
        return f"StudentProfile(user={self.user_id})"


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_student_profile(sender, instance, created, **kwargs):
    if created:
        StudentProfile.objects.get_or_create(user=instance)
