from django.contrib import admin

from .models import StudyPlan, StudyPlanItem


class StudyPlanItemInline(admin.TabularInline):
    model = StudyPlanItem
    extra = 0


@admin.register(StudyPlan)
class StudyPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "title", "status", "start_date", "target_date")
    list_filter = ("status",)
    search_fields = ("title",)
    inlines = [StudyPlanItemInline]
