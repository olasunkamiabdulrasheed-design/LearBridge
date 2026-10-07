from django.contrib import admin

from .models import Question


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "assessment", "ordering", "question_type", "difficulty", "topic")
    list_filter = ("question_type", "difficulty")
    search_fields = ("question_text", "topic")
