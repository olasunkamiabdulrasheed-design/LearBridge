"""Auth + student-profile endpoints."""
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.permissions import IsOwner

from .models import StudentProfile
from .serializers import RegisterSerializer, StudentProfileSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/ — public. Returns user + JWT pair."""

    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class MeView(generics.RetrieveAPIView):
    """GET /api/v1/auth/me/ — current user + profile."""

    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        profile = getattr(user, "student_profile", None)
        return Response(
            {
                "user": UserSerializer(user).data,
                "profile": (
                    StudentProfileSerializer(profile).data if profile else None
                ),
            }
        )


class StudentProfileViewSet(
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    """Student-private. Queryset is always scoped to the requesting user."""

    serializer_class = StudentProfileSerializer
    permission_classes = [IsAuthenticated, IsOwner]

    def get_queryset(self):
        return StudentProfile.objects.filter(user=self.request.user).select_related("user")

    @action(detail=False, methods=["get", "put", "patch"], url_path="me")
    def me(self, request):
        profile = request.user.student_profile
        if request.method == "GET":
            self.check_object_permissions(request, profile)
            return Response(self.get_serializer(profile).data)
        self.check_object_permissions(request, profile)
        serializer = self.get_serializer(profile, data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
