from django.contrib import admin

from .models import AgentEvent, AgentRun


class AgentEventInline(admin.TabularInline):
    model = AgentEvent
    extra = 0
    readonly_fields = ("seq", "kind", "summary", "created_at")
    can_delete = False


@admin.register(AgentRun)
class AgentRunAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "purpose", "status", "started_at", "completed_at")
    list_filter = ("status", "purpose")
    readonly_fields = ("started_at", "completed_at")
    inlines = [AgentEventInline]
