from django.contrib import admin

from .models import Progress


@admin.register(Progress)
class ProgressAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "study_plan_item", "status", "completion_percentage")
    list_filter = ("status",)
