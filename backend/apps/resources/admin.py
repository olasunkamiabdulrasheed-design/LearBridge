from django.contrib import admin

from .models import LearningResource


@admin.register(LearningResource)
class LearningResourceAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "subject", "topic", "resource_type", "is_verified")
    list_filter = ("resource_type", "difficulty", "is_verified")
    search_fields = ("title", "subject", "topic", "source_name")
