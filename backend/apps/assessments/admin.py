from django.contrib import admin

from .models import Answer, Assessment, AssessmentAttempt


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0
    readonly_fields = ("is_correct", "answered_at")


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "subject", "status", "updated_at")
    list_filter = ("status", "subject")
    search_fields = ("title", "subject", "description")


@admin.register(AssessmentAttempt)
class AssessmentAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "assessment", "status", "score", "percentage")
    list_filter = ("status",)
    inlines = [AnswerInline]
