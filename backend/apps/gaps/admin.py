from django.contrib import admin

from .models import LearningGap


@admin.register(LearningGap)
class LearningGapAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "subject", "topic", "severity", "status")
    list_filter = ("severity", "status", "source")
    search_fields = ("subject", "topic", "description")
