"""Stage-2 API assembly. Everything lives under /api/v1/ (see config/urls.py)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.agent_runs.views import AgentRunViewSet
from apps.assessments.views import AssessmentViewSet, AttemptViewSet
from apps.gaps.views import LearningGapViewSet
from apps.plans.views import StudyPlanViewSet
from apps.progress.views import ProgressViewSet
from apps.reports.views import LearningReportViewSet
from apps.resources.views import LearningResourceViewSet
from apps.users.views import MeView, RegisterView, StudentProfileViewSet

router = DefaultRouter()
router.register("students", StudentProfileViewSet, basename="student")
router.register("assessments", AssessmentViewSet, basename="assessment")
router.register("attempts", AttemptViewSet, basename="attempt")
router.register("gaps", LearningGapViewSet, basename="gap")
router.register("resources", LearningResourceViewSet, basename="resource")
router.register("study-plans", StudyPlanViewSet, basename="studyplan")
router.register("progress", ProgressViewSet, basename="progress")
router.register("agent-runs", AgentRunViewSet, basename="agentrun")
router.register("reports", LearningReportViewSet, basename="report")

auth_patterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
]

urlpatterns = [
    path("", include("apps.core.urls")),
    path("auth/", include(auth_patterns)),
    path("", include(router.urls)),
]
