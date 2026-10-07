"""Learning-gap tests."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import auth_client, make_user
from apps.gaps.models import GapSource, LearningGap


def make_gap(student_profile, **kwargs):
    defaults = {
        "subject": "Mathematics",
        "topic": "fractions",
        "description": "Struggles with fraction addition.",
        "severity": "high",
        "source": GapSource.MANUAL,
    }
    defaults.update(kwargs)
    return LearningGap.objects.create(student=student_profile, **defaults)


class LearningGapTests(APITestCase):
    def setUp(self):
        self.ada = make_user("ada")
        self.bob = make_user("bob")
        self.ada_client = auth_client(self.ada)
        self.bob_client = auth_client(self.bob)
        self.gap = make_gap(self.ada.student_profile)

    def test_list_own_gaps(self):
        response = self.ada_client.get("/api/v1/gaps/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["topic"], "fractions")

    def test_list_scoped_per_student(self):
        response = self.bob_client.get("/api/v1/gaps/")
        self.assertEqual(len(response.data["results"]), 0)

    def test_retrieve_own_gap(self):
        response = self.ada_client.get(f"/api/v1/gaps/{self.gap.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_cannot_retrieve_other_gap(self):
        response = self.bob_client.get(f"/api/v1/gaps/{self.gap.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_filter_by_subject_status_severity(self):
        make_gap(self.ada.student_profile, subject="Physics", topic="kinematics", severity="low")
        for query, expected in (
            ("?subject=physics", 1),
            ("?severity=high", 1),
            ("?status=open", 2),
            ("?subject=physics&severity=low", 1),
            ("?subject=chemistry", 0),
        ):
            response = self.ada_client.get(f"/api/v1/gaps/{query}")
            self.assertEqual(len(response.data["results"]), expected, msg=query)

    def test_student_cannot_create_gap_directly(self):
        response = self.ada_client.post(
            "/api/v1/gaps/", {"subject": "Math", "topic": "x"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        from rest_framework.test import APIClient

        response = APIClient().get("/api/v1/gaps/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
