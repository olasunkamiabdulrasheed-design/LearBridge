"""Agent-run + report API tests: pipeline, failures, ownership, evidence."""
import os
from unittest import mock

from rest_framework import status
from rest_framework.test import APITestCase

from apps.agent_runs.models import AgentRun
from apps.core.test_utils import auth_client, make_user
from apps.gaps.models import GapSource, LearningGap
from apps.plans.models import StudyPlan
from apps.reports.models import LearningReport
from apps.resources.models import LearningResource


def make_gap(profile, topic="fractions", subject="Mathematics"):
    return LearningGap.objects.create(
        student=profile, subject=subject, topic=topic,
        description="d", severity="high", source=GapSource.ASSESSMENT,
        evidence="Attempt 1 on 'Math diagnostic'",
    )


def make_resource(topic="fractions", title="Fractions practice"):
    return LearningResource.objects.create(
        title=title, description="Practice adding fractions.",
        url=f"https://example.org/{title.replace(' ', '-').lower()}",
        resource_type="practice", subject="Mathematics", topic=topic,
        difficulty="beginner", source_name="Catalog",
    )


class AgentRunApiTests(APITestCase):
    def setUp(self):
        self.ada = make_user("ada")
        self.client = auth_client(self.ada)
        self.gap = make_gap(self.ada.student_profile)
        make_resource()

    def start_run(self, payload=None):
        return self.client.post("/api/v1/agent-runs/", payload or {}, format="json")

    def test_start_run_builds_plan_and_report(self):
        response = self.start_run({"gap_ids": [self.gap.id]})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        data = response.data
        self.assertEqual(data["status"], "succeeded")
        self.assertIn("plan_id", data["result"])
        self.assertIn("report_id", data["result"])
        kinds = [e["kind"] for e in data["events"]]
        self.assertEqual(kinds[0], "started")
        self.assertEqual(kinds[-1], "completed")
        self.assertIn("plan_built", kinds)
        self.assertIn("report_written", kinds)

        plan = StudyPlan.objects.get(pk=data["result"]["plan_id"])
        self.assertEqual(plan.origin, "agent")
        self.assertEqual(plan.agent_run_id, data["id"])
        item = plan.items.get()
        self.assertTrue(item.rationale)
        self.assertIn("fractions", item.rationale)
        self.assertIsNotNone(item.resource)

        report = LearningReport.objects.get(pk=data["result"]["report_id"])
        finding = report.findings[0]
        self.assertEqual(finding["gap_id"], self.gap.id)
        self.assertEqual(finding["topic"], "fractions")
        self.assertTrue(finding["resources"])
        self.assertIn("plan_item_ids", finding)

    def test_evidence_is_specific_not_generic(self):
        response = self.start_run({"gap_ids": [self.gap.id]})
        report = LearningReport.objects.get(pk=response.data["result"]["report_id"])
        blob = (report.summary + str(report.findings)).casefold()
        self.assertIn("fractions", blob)
        self.assertIn("attempt 1", blob)

    def test_no_gaps_succeeds_without_plan(self):
        self.gap.status = "resolved"
        self.gap.save()
        response = self.start_run({})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "succeeded")
        self.assertIsNone(response.data["result"]["plan_id"])

    def test_rejects_foreign_gap_ids(self):
        bob = make_user("bob")
        foreign = make_gap(bob.student_profile, topic="kinematics", subject="Physics")
        response = self.start_run({"gap_ids": [foreign.id]})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AgentRun.objects.count(), 0)

    def test_second_active_run_rejected(self):
        AgentRun.objects.create(student=self.ada.student_profile, purpose="remediate_gaps")
        response = self.start_run({})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_failure_records_step_and_error(self):
        with mock.patch(
            "apps.agent.orchestrator.tools.build_study_plan",
            side_effect=Exception("boom"),
        ):
            response = self.start_run({"gap_ids": [self.gap.id]})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "failed")
        self.assertEqual(response.data["error"]["step"], "build_study_plan")
        kinds = [e["kind"] for e in response.data["events"]]
        self.assertIn("failed", kinds)

    def test_disabled_agent_returns_503(self):
        with mock.patch.dict(os.environ, {"AGENT_ENABLED": "False"}):
            response = self.start_run({})
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_refresh_plan_recommends_next_item(self):
        plan = StudyPlan.objects.create(
            student=self.ada.student_profile, title="P",
            start_date="2026-10-01", target_date="2026-10-14",
        )
        from apps.plans.models import StudyPlanItem

        StudyPlanItem.objects.create(study_plan=plan, title="First", ordering=1)
        response = self.start_run({"purpose": "refresh_plan", "plan_id": plan.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "succeeded")
        self.assertEqual(response.data["result"]["recommendation"]["next_item_title"], "First")

    def test_refresh_plan_rejects_foreign_plan(self):
        bob = make_user("bob")
        plan = StudyPlan.objects.create(
            student=bob.student_profile, title="P",
            start_date="2026-10-01", target_date="2026-10-14",
        )
        response = self.start_run({"purpose": "refresh_plan", "plan_id": plan.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_and_filter_own_runs(self):
        self.start_run({"gap_ids": [self.gap.id]})
        listed = self.client.get("/api/v1/agent-runs/")
        self.assertEqual(len(listed.data["results"]), 1)
        filtered = self.client.get("/api/v1/agent-runs/?status=succeeded")
        self.assertEqual(len(filtered.data["results"]), 1)
        empty = self.client.get("/api/v1/agent-runs/?status=failed")
        self.assertEqual(len(empty.data["results"]), 0)

    def test_cancel_finished_run_rejected(self):
        run_id = self.start_run({"gap_ids": [self.gap.id]}).data["id"]
        response = self.client.post(f"/api/v1/agent-runs/{run_id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cancel_active_run(self):
        run = AgentRun.objects.create(
            student=self.ada.student_profile, purpose="remediate_gaps", status="running"
        )
        response = self.client.post(f"/api/v1/agent-runs/{run.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")

    def test_cannot_access_other_students_run(self):
        run_id = self.start_run({"gap_ids": [self.gap.id]}).data["id"]
        bob_client = auth_client(make_user("bob"))
        self.assertEqual(bob_client.get(f"/api/v1/agent-runs/{run_id}/").status_code,
                         status.HTTP_404_NOT_FOUND)
        self.assertEqual(len(bob_client.get("/api/v1/agent-runs/").data["results"]), 0)

    def test_requires_auth(self):
        from rest_framework.test import APIClient

        self.assertEqual(APIClient().get("/api/v1/agent-runs/").status_code,
                         status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(APIClient().post("/api/v1/agent-runs/", {}).status_code,
                         status.HTTP_401_UNAUTHORIZED)


class LearningReportApiTests(APITestCase):
    def setUp(self):
        self.ada = make_user("ada")
        self.client = auth_client(self.ada)
        make_gap(self.ada.student_profile)
        make_resource()
        run_id = self.client.post("/api/v1/agent-runs/", {}, format="json").data["id"]
        self.report_id = AgentRun.objects.get(pk=run_id).report.id

    def test_list_own_reports(self):
        response = self.client.get("/api/v1/reports/")
        self.assertEqual(len(response.data["results"]), 1)

    def test_retrieve_own_report(self):
        response = self.client.get(f"/api/v1/reports/{self.report_id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["findings"])

    def test_cannot_access_other_report(self):
        bob_client = auth_client(make_user("bob"))
        response = bob_client.get(f"/api/v1/reports/{self.report_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(len(bob_client.get("/api/v1/reports/").data["results"]), 0)
