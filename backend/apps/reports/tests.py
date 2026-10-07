"""Report endpoint coverage also lives in apps/agent_runs/tests.py.

This module asserts the reports app's own read-only contract explicitly.
"""
from rest_framework.test import APITestCase

from apps.core.test_utils import auth_client, make_user


class ReportContractTests(APITestCase):
    def test_reports_require_auth(self):
        from rest_framework.test import APIClient

        self.assertEqual(APIClient().get("/api/v1/reports/").status_code, 401)

    def test_empty_list_for_new_student(self):
        client = auth_client(make_user("newbie"))
        response = client.get("/api/v1/reports/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"], [])

    def test_reports_are_read_only(self):
        client = auth_client(make_user("newbie"))
        for method in ("post", "put", "patch", "delete"):
            func = getattr(client, method)
            response = func("/api/v1/reports/", {}, format="json")
            self.assertIn(response.status_code, (401, 403, 404, 405))
