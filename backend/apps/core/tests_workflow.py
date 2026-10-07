"""End-to-end education workflow test.

register/login → profile → choose assessment → start attempt → submit
answers → complete → result → gaps → study plan → plan items → progress.
"""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import make_assessment, make_question


class LearningWorkflowTests(APITestCase):
    def test_full_journey(self):
        # register
        reg = self.client.post(
            "/api/v1/auth/register/",
            {"username": "ada", "email": "ada@example.com", "password": "strongpass123"},
            format="json",
        )
        self.assertEqual(reg.status_code, status.HTTP_201_CREATED)
        token = reg.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

        # create/retrieve student profile
        me = self.client.get("/api/v1/students/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        profile = self.client.patch(
            "/api/v1/students/me/", {"education_level": "high"}, format="json"
        )
        self.assertEqual(profile.status_code, status.HTTP_200_OK)

        # choose assessment
        assessment = make_assessment()
        q1 = make_question(assessment, ordering=1, topic="linear equations", correct="B")
        q2 = make_question(
            assessment, ordering=2, topic="fractions", correct="true",
            question_type="true_false",
        )
        listed = self.client.get("/api/v1/assessments/")
        self.assertEqual(len(listed.data["results"]), 1)

        # start attempt
        attempt = self.client.post(f"/api/v1/assessments/{assessment.id}/start/")
        self.assertEqual(attempt.status_code, status.HTTP_201_CREATED)
        attempt_id = attempt.data["id"]

        # submit answers (one right, one wrong)
        submitted = self.client.post(
            f"/api/v1/attempts/{attempt_id}/answers/",
            {"answers": [{"question": q1.id, "answer": "B"}, {"question": q2.id, "answer": "false"}]},
            format="json",
        )
        self.assertEqual(submitted.status_code, status.HTTP_200_OK)

        # complete + retrieve result
        completed = self.client.post(f"/api/v1/attempts/{attempt_id}/complete/")
        self.assertEqual(completed.status_code, status.HTTP_200_OK)
        self.assertEqual(completed.data["score"], 1)
        result = self.client.get(f"/api/v1/attempts/{attempt_id}/result/")
        self.assertEqual(result.data["percentage"], 50.0)

        # learning gaps become available
        gaps = self.client.get("/api/v1/gaps/")
        self.assertEqual(len(gaps.data["results"]), 1)
        gap_id = gaps.data["results"][0]["id"]

        # create study plan + item linked to the gap
        plan = self.client.post(
            "/api/v1/study-plans/",
            {
                "title": "Catch up on fractions",
                "start_date": "2026-10-01",
                "target_date": "2026-10-14",
            },
            format="json",
        )
        self.assertEqual(plan.status_code, status.HTTP_201_CREATED)
        plan_id = plan.data["id"]
        item = self.client.post(
            f"/api/v1/study-plans/{plan_id}/items/",
            {"learning_gap": gap_id, "title": "Fractions practice", "ordering": 1},
            format="json",
        )
        self.assertEqual(item.status_code, status.HTTP_201_CREATED)

        # track progress
        progress_list = self.client.get(f"/api/v1/progress/?study_plan={plan_id}")
        self.assertEqual(len(progress_list.data["results"]), 1)
        progress_id = progress_list.data["results"][0]["id"]
        updated = self.client.patch(
            f"/api/v1/progress/{progress_id}/",
            {"status": "completed"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["completion_percentage"], 100.0)
