from django.contrib import admin

from .models import LearningReport


@admin.register(LearningReport)
class LearningReportAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "agent_run", "title", "created_at")
    search_fields = ("title", "summary")
