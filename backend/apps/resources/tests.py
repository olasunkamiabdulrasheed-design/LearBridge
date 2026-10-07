"""Learning-resource catalog tests."""
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import auth_client, make_user
from apps.resources.models import LearningResource


def make_resource(**kwargs):
    defaults = {
        "title": "Intro video",
        "description": "A helpful intro.",
        "url": "https://example.org/intro",
        "resource_type": "video",
        "subject": "Mathematics",
        "topic": "fractions",
        "difficulty": "beginner",
        "source_name": "Catalog",
    }
    defaults.update(kwargs)
    return LearningResource.objects.create(**defaults)


class LearningResourceTests(APITestCase):
    def setUp(self):
        self.user = make_user("ada")
        self.client = auth_client(self.user)
        make_resource()
        make_resource(
            title="Advanced text",
            resource_type="article",
            subject="Physics",
            topic="kinematics",
            difficulty="advanced",
        )

    def test_list_resources(self):
        response = self.client.get("/api/v1/resources/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 2)

    def test_filter_by_subject_topic_difficulty(self):
        cases = (
            ("?subject=physics", 1),
            ("?topic=fractions", 1),
            ("?difficulty=advanced", 1),
            ("?resource_type=video", 1),
            ("?subject=physics&difficulty=beginner", 0),
        )
        for query, expected in cases:
            response = self.client.get(f"/api/v1/resources/{query}")
            self.assertEqual(len(response.data["results"]), expected, msg=query)

    def test_retrieve_resource(self):
        resource = LearningResource.objects.first()
        response = self.client.get(f"/api/v1/resources/{resource.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], resource.title)

    def test_student_cannot_create_resource(self):
        response = self.client.post(
            "/api/v1/resources/",
            {"title": "Hack", "url": "https://example.org/x", "subject": "Math"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        from rest_framework.test import APIClient

        response = APIClient().get("/api/v1/resources/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
