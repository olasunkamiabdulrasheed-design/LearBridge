from django.contrib import admin

from .models import StudentProfile


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "education_level", "field_of_study", "updated_at")
    list_filter = ("education_level", "preferred_learning_style")
    search_fields = ("user__username", "user__email", "institution", "field_of_study")
