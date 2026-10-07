"""Progress-tracking tests."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import auth_client, make_user
from apps.plans.models import StudyPlan
from apps.progress.models import Progress


class ProgressTests(APITestCase):
    def setUp(self):
        self.ada = make_user("ada")
        self.bob = make_user("bob")
        self.ada_client = auth_client(self.ada)
        self.bob_client = auth_client(self.bob)
        self.plan = StudyPlan.objects.create(
            student=self.ada.student_profile,
            title="Plan",
            start_date="2026-10-01",
            target_date="2026-10-14",
        )
        item = self.ada_client.post(
            f"/api/v1/study-plans/{self.plan.id}/items/",
            {"title": "Item 1", "ordering": 1},
            format="json",
        )
        self.assertEqual(item.status_code, status.HTTP_201_CREATED)
        self.item_id = item.data["id"]
        self.progress = Progress.objects.get(study_plan_item_id=self.item_id)

    def test_progress_auto_created_for_new_item(self):
        self.assertEqual(self.progress.student, self.ada.student_profile)
        self.assertEqual(self.progress.completion_percentage, 0.0)

    def test_update_progress(self):
        response = self.ada_client.patch(
            f"/api/v1/progress/{self.progress.id}/",
            {"status": "in_progress", "completion_percentage": 40.0, "notes": "Halfway"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["completion_percentage"], 40.0)
        self.assertIsNone(response.data["completed_at"])

    def test_completing_sets_timestamp_and_full_percentage(self):
        response = self.ada_client.patch(
            f"/api/v1/progress/{self.progress.id}/", {"status": "completed"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["completion_percentage"], 100.0)
        self.assertIsNotNone(response.data["completed_at"])

    def test_rejects_percentage_over_100(self):
        response = self.ada_client.patch(
            f"/api/v1/progress/{self.progress.id}/",
            {"completion_percentage": 150.0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_filter_by_study_plan(self):
        other_plan = StudyPlan.objects.create(
            student=self.ada.student_profile,
            title="Other",
            start_date="2026-10-01",
            target_date="2026-10-14",
        )
        self.ada_client.post(
            f"/api/v1/study-plans/{other_plan.id}/items/",
            {"title": "Other item", "ordering": 1},
            format="json",
        )
        response = self.ada_client.get(f"/api/v1/progress/?study_plan={self.plan.id}")
        self.assertEqual(len(response.data["results"]), 1)

    def test_cannot_access_other_progress(self):
        response = self.bob_client.get(f"/api/v1/progress/{self.progress.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        response = self.bob_client.patch(
            f"/api/v1/progress/{self.progress.id}/",
            {"completion_percentage": 99.0},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_scoped_to_owner(self):
        response = self.bob_client.get("/api/v1/progress/")
        self.assertEqual(len(response.data["results"]), 0)
