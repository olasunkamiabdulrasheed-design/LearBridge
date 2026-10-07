"""Auth + student-profile tests."""
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.test_utils import auth_client, make_user
from apps.users.models import StudentProfile


class RegistrationTests(APITestCase):
    def test_register_creates_user_profile_and_tokens(self):
        response = self.client.post(
            reverse("auth-register"),
            {"username": "ada", "email": "ada@example.com", "password": "strongpass123"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(
            StudentProfile.objects.filter(user__username="ada").exists()
        )

    def test_register_rejects_weak_password(self):
        response = self.client.post(
            reverse("auth-register"),
            {"username": "bob", "email": "bob@example.com", "password": "123"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_duplicate_email(self):
        make_user("existing", email="taken@example.com")
        response = self.client.post(
            reverse("auth-register"),
            {"username": "new", "email": "taken@example.com", "password": "strongpass123"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_is_hashed(self):
        from django.contrib.auth import get_user_model

        self.client.post(
            reverse("auth-register"),
            {"username": "hashed", "email": "h@example.com", "password": "strongpass123"},
        )
        user = get_user_model().objects.get(username="hashed")
        self.assertNotEqual(user.password, "strongpass123")
        self.assertTrue(user.check_password("strongpass123"))


class LoginTests(APITestCase):
    def setUp(self):
        make_user("ada", password="strongpass123")

    def test_login_returns_token_pair(self):
        response = self.client.post(
            reverse("auth-login"), {"username": "ada", "password": "strongpass123"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_rejects_bad_credentials(self):
        response = self.client.post(
            reverse("auth-login"), {"username": "ada", "password": "wrongpass"}
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_returns_new_access_token(self):
        login = self.client.post(
            reverse("auth-login"), {"username": "ada", "password": "strongpass123"}
        )
        response = self.client.post(
            reverse("auth-refresh"), {"refresh": login.data["refresh"]}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_me_returns_user_and_profile(self):
        user = make_user("me_user")
        client = auth_client(user)
        response = client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "me_user")
        self.assertIsNotNone(response.data["profile"])

    def test_private_endpoints_require_auth(self):
        response = self.client.get(reverse("auth-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class StudentProfileTests(APITestCase):
    def setUp(self):
        self.user = make_user("ada")
        self.client = auth_client(self.user)

    def test_profile_auto_created(self):
        self.assertTrue(hasattr(self.user, "student_profile"))

    def test_retrieve_own_profile_via_me(self):
        response = self.client.get("/api/v1/students/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "ada")

    def test_update_own_profile(self):
        response = self.client.patch(
            "/api/v1/students/me/",
            {"education_level": "undergraduate", "field_of_study": "Physics"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["education_level"], "undergraduate")
        self.assertEqual(response.data["field_of_study"], "Physics")

    def test_update_rejects_bad_choice(self):
        response = self.client.patch(
            "/api/v1/students/me/", {"education_level": "wizard"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_list_returns_only_own_profile(self):
        other = make_user("other")
        self.assertTrue(hasattr(other, "student_profile"))
        response = self.client.get("/api/v1/students/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["user"]["username"], "ada")

    def test_cannot_access_other_profile(self):
        other = make_user("other")
        other_profile_id = other.student_profile.id
        response = self.client.get(f"/api/v1/students/{other_profile_id}/")
        # Scoped queryset → 404, never leaks existence details.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
