"""Assessment catalog + attempt workflow tests."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.assessments.models import AssessmentStatus
from apps.core.test_utils import auth_client, make_assessment, make_question, make_user


class AssessmentCatalogTests(APITestCase):
    def setUp(self):
        self.user = make_user("ada")
        self.client = auth_client(self.user)
        self.published = make_assessment(subject="Mathematics")
        make_question(self.published, ordering=1)
        self.draft = make_assessment(
            subject="History", status=AssessmentStatus.DRAFT, title="History draft"
        )

    def test_list_shows_only_published(self):
        response = self.client.get(reverse("assessment-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        titles = [a["title"] for a in response.data["results"]]
        self.assertIn(self.published.title, titles)
        self.assertNotIn(self.draft.title, titles)

    def test_list_filter_by_subject(self):
        response = self.client.get(reverse("assessment-list") + "?subject=mathematics")
        self.assertEqual(len(response.data["results"]), 1)

    def test_retrieve_published(self):
        response = self.client.get(reverse("assessment-detail", args=[self.published.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["question_count"], 1)

    def test_retrieve_draft_is_hidden(self):
        response = self.client.get(reverse("assessment-detail", args=[self.draft.id]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_questions_hide_correct_answers_from_students(self):
        response = self.client.get(f"/api/v1/assessments/{self.published.id}/questions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        question = response.data["results"][0]
        self.assertNotIn("correct_answer", question)
        self.assertNotIn("explanation", question)
        self.assertIn("options", question)

    def test_student_cannot_create_assessment(self):
        response = self.client.post(
            reverse("assessment-list"), {"title": "Hack", "subject": "X"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        response = self.client.get(reverse("assessment-list"))
        # NOTE: self.client is authed here; use a fresh client.
        from rest_framework.test import APIClient

        response = APIClient().get(reverse("assessment-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AttemptWorkflowTests(APITestCase):
    def setUp(self):
        self.user = make_user("ada")
        self.client = auth_client(self.user)
        self.assessment = make_assessment()
        self.q1 = make_question(self.assessment, ordering=1, topic="linear equations", correct="B")
        self.q2 = make_question(
            self.assessment, ordering=2, topic="fractions", correct="true",
            question_type="true_false",
        )

    def start_attempt(self):
        return self.client.post(f"/api/v1/assessments/{self.assessment.id}/start/")

    def test_start_attempt(self):
        response = self.start_attempt()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "in_progress")
        self.assertEqual(response.data["assessment"], self.assessment.id)

    def test_cannot_start_twice_while_in_progress(self):
        self.start_attempt()
        response = self.start_attempt()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_answers_grades_server_side(self):
        attempt_id = self.start_attempt().data["id"]
        response = self.client.post(
            f"/api/v1/attempts/{attempt_id}/answers/",
            {
                "answers": [
                    {"question": self.q1.id, "answer": "b"},  # case-insensitive match
                    {"question": self.q2.id, "answer": "false"},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        by_q = {a["question"]: a for a in response.data}
        self.assertTrue(by_q[self.q1.id]["is_correct"])
        self.assertFalse(by_q[self.q2.id]["is_correct"])

    def test_submit_rejects_empty_payload(self):
        attempt_id = self.start_attempt().data["id"]
        response = self.client.post(
            f"/api/v1/attempts/{attempt_id}/answers/", {"answers": []}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_rejects_foreign_question(self):
        other = make_assessment(subject="History", title="Other")
        foreign_q = make_question(other, ordering=1, topic="dates")
        attempt_id = self.start_attempt().data["id"]
        response = self.client.post(
            f"/api/v1/attempts/{attempt_id}/answers/",
            {"answers": [{"question": foreign_q.id, "answer": "x"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complete_calculates_score_and_derives_gaps(self):
        attempt_id = self.start_attempt().data["id"]
        self.client.post(
            f"/api/v1/attempts/{attempt_id}/answers/",
            {
                "answers": [
                    {"question": self.q1.id, "answer": "B"},
                    {"question": self.q2.id, "answer": "false"},
                ]
            },
            format="json",
        )
        response = self.client.post(f"/api/v1/attempts/{attempt_id}/complete/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "completed")
        self.assertEqual(response.data["score"], 1)
        self.assertEqual(response.data["percentage"], 50.0)
        self.assertIsNotNone(response.data["completed_at"])
        self.assertEqual(response.data["gaps_created"], 1)

        gaps = self.client.get("/api/v1/gaps/").data["results"]
        self.assertEqual(len(gaps), 1)
        self.assertEqual(gaps[0]["topic"], "fractions")
        self.assertEqual(gaps[0]["subject"], "Mathematics")

    def test_complete_twice_fails(self):
        attempt_id = self.start_attempt().data["id"]
        self.client.post(f"/api/v1/attempts/{attempt_id}/complete/")
        response = self.client.post(f"/api/v1/attempts/{attempt_id}/complete/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_after_complete_fails(self):
        attempt_id = self.start_attempt().data["id"]
        self.client.post(f"/api/v1/attempts/{attempt_id}/complete/")
        response = self.client.post(
            f"/api/v1/attempts/{attempt_id}/answers/",
            {"answers": [{"question": self.q1.id, "answer": "B"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_result_retrieval(self):
        attempt_id = self.start_attempt().data["id"]
        response = self.client.get(f"/api/v1/attempts/{attempt_id}/result/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], attempt_id)


class AttemptOwnershipTests(APITestCase):
    def setUp(self):
        self.ada = make_user("ada")
        self.bob = make_user("bob")
        self.ada_client = auth_client(self.ada)
        self.bob_client = auth_client(self.bob)
        self.assessment = make_assessment()
        make_question(self.assessment, ordering=1)

    def test_student_cannot_access_other_attempt(self):
        attempt_id = self.ada_client.post(
            f"/api/v1/assessments/{self.assessment.id}/start/"
        ).data["id"]
        for url in (
            f"/api/v1/attempts/{attempt_id}/",
            f"/api/v1/attempts/{attempt_id}/result/",
        ):
            response = self.bob_client.get(url)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_student_cannot_complete_other_attempt(self):
        attempt_id = self.ada_client.post(
            f"/api/v1/assessments/{self.assessment.id}/start/"
        ).data["id"]
        response = self.bob_client.post(f"/api/v1/attempts/{attempt_id}/complete/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_scoped_to_own_attempts(self):
        self.ada_client.post(f"/api/v1/assessments/{self.assessment.id}/start/")
        response = self.bob_client.get("/api/v1/attempts/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)
