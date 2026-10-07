"""Agent-run serializers. Runs are created via POST; events/result are read-only."""
from rest_framework import serializers

from apps.agent_runs.models import AgentEvent, AgentRun


class AgentEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentEvent
        fields = ["id", "seq", "kind", "summary", "payload", "created_at"]
        read_only_fields = fields


class AgentRunSerializer(serializers.ModelSerializer):
    student = serializers.PrimaryKeyRelatedField(read_only=True)
    events = AgentEventSerializer(many=True, read_only=True)

    class Meta:
        model = AgentRun
        fields = [
            "id", "student", "purpose", "status", "started_at", "completed_at",
            "input_context", "result", "error", "events",
        ]
        read_only_fields = fields


class AgentRunCreateSerializer(serializers.Serializer):
    purpose = serializers.ChoiceField(
        choices=["remediate_gaps", "refresh_plan"], default="remediate_gaps"
    )
    gap_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, allow_empty=True
    )
    plan_id = serializers.IntegerField(min_value=1, required=False)
    target_date = serializers.DateField(required=False)

    def validate(self, attrs):
        request = self.context.get("request")
        profile = request.user.student_profile
        gap_ids = attrs.get("gap_ids") or []
        if gap_ids:
            owned = set(
                profile.gaps.filter(id__in=gap_ids).values_list("id", flat=True)
            )
            missing = set(gap_ids) - owned
            if missing:
                raise serializers.ValidationError(
                    {"gap_ids": f"Gaps not available: {sorted(missing)}."}
                )
        if attrs.get("purpose") == "refresh_plan":
            if not attrs.get("plan_id"):
                raise serializers.ValidationError(
                    {"plan_id": "refresh_plan requires a plan_id."}
                )
            if not profile.study_plans.filter(pk=attrs["plan_id"]).exists():
                raise serializers.ValidationError(
                    {"plan_id": "Plan not available to this student."}
                )
        return attrs
