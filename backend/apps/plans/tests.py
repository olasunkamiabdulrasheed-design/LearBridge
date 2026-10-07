"""Study-plan + plan-item tests."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import auth_client, make_user
from apps.gaps.models import GapSource, LearningGap


def make_plan_payload(**kwargs):
    payload = {
        "title": "Fractions catch-up",
        "description": "Two-week plan.",
        "start_date": "2026-10-01",
        "target_date": "2026-10-14",
    }
    payload.update(kwargs)
    return payload


class StudyPlanTests(APITestCase):
    def setUp(self):
        self.ada = make_user("ada")
        self.bob = make_user("bob")
        self.ada_client = auth_client(self.ada)
        self.bob_client = auth_client(self.bob)

    def create_plan(self):
        return self.ada_client.post(
            "/api/v1/study-plans/", make_plan_payload(), format="json"
        )

    def test_create_plan(self):
        response = self.create_plan()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["student"], self.ada.student_profile.id)
        self.assertEqual(response.data["status"], "active")

    def test_create_rejects_inverted_dates(self):
        response = self.ada_client.post(
            "/api/v1/study-plans/",
            make_plan_payload(start_date="2026-10-14", target_date="2026-10-01"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_scoped_to_owner(self):
        self.create_plan()
        self.assertEqual(len(self.ada_client.get("/api/v1/study-plans/").data["results"]), 1)
        self.assertEqual(len(self.bob_client.get("/api/v1/study-plans/").data["results"]), 0)

    def test_cannot_retrieve_other_plan(self):
        plan_id = self.create_plan().data["id"]
        response = self.bob_client.get(f"/api/v1/study-plans/{plan_id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_own_plan(self):
        plan_id = self.create_plan().data["id"]
        response = self.ada_client.patch(
            f"/api/v1/study-plans/{plan_id}/", {"status": "paused"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "paused")

    def test_plan_items_crud(self):
        plan_id = self.create_plan().data["id"]
        gap = LearningGap.objects.create(
            student=self.ada.student_profile,
            subject="Mathematics",
            topic="fractions",
            source=GapSource.MANUAL,
        )
        created = self.ada_client.post(
            f"/api/v1/study-plans/{plan_id}/items/",
            {
                "learning_gap": gap.id,
                "title": "Watch fractions intro",
                "scheduled_date": "2026-10-03",
                "estimated_minutes": 30,
                "ordering": 1,
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        item_id = created.data["id"]

        listed = self.ada_client.get(f"/api/v1/study-plans/{plan_id}/items/")
        self.assertEqual(len(listed.data["results"]), 1)

        detail = self.ada_client.get(f"/api/v1/study-plans/{plan_id}/items/{item_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)

        updated = self.ada_client.patch(
            f"/api/v1/study-plans/{plan_id}/items/{item_id}/",
            {"status": "in_progress"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["status"], "in_progress")

    def test_item_scheduled_date_outside_plan_rejected(self):
        plan_id = self.create_plan().data["id"]
        response = self.ada_client.post(
            f"/api/v1/study-plans/{plan_id}/items/",
            {"title": "Late item", "scheduled_date": "2026-11-01", "ordering": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_duplicate_item_ordering_rejected(self):
        plan_id = self.create_plan().data["id"]
        payload = {"title": "Item", "ordering": 1}
        self.ada_client.post(f"/api/v1/study-plans/{plan_id}/items/", payload, format="json")
        response = self.ada_client.post(
            f"/api/v1/study-plans/{plan_id}/items/", payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_link_other_student_gap(self):
        plan_id = self.create_plan().data["id"]
        gap = LearningGap.objects.create(
            student=self.bob.student_profile,
            subject="Mathematics",
            topic="fractions",
            source=GapSource.MANUAL,
        )
        response = self.ada_client.post(
            f"/api/v1/study-plans/{plan_id}/items/",
            {"title": "Item", "learning_gap": gap.id, "ordering": 1},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_touch_other_plan_items(self):
        plan_id = self.create_plan().data["id"]
        self.ada_client.post(
            f"/api/v1/study-plans/{plan_id}/items/",
            {"title": "Item", "ordering": 1},
            format="json",
        )
        response = self.bob_client.get(f"/api/v1/study-plans/{plan_id}/items/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
