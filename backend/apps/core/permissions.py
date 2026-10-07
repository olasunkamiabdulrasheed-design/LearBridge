"""Shared DRF permissions.

All student-private objects carry an ownership path to a User:
- directly via ``obj.user`` (StudentProfile),
- via ``obj.student.user`` (attempts, answers, gaps, plans, progress),
- via ``obj.study_plan.student.user`` (plan items),
- via ``obj.attempt.student.user`` (answers).
"""
from rest_framework.permissions import BasePermission


def owner_user(obj):
    """Return the User that owns ``obj``, or None if not resolvable."""
    student = getattr(obj, "student", None)
    if student is not None:
        return getattr(student, "user", None)
    user = getattr(obj, "user", None)
    if user is not None:
        return user
    study_plan = getattr(obj, "study_plan", None)
    if study_plan is not None:
        student = getattr(study_plan, "student", None)
        return getattr(student, "user", None)
    attempt = getattr(obj, "attempt", None)
    if attempt is not None:
        student = getattr(attempt, "student", None)
        return getattr(student, "user", None)
    run = getattr(obj, "run", None)
    if run is not None:
        student = getattr(run, "student", None)
        return getattr(student, "user", None)
    return None


class IsOwner(BasePermission):
    """Object-level ownership. Staff bypass for admin/support tooling."""

    message = "You do not have access to this object."

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        return owner_user(obj) == request.user


class IsStaffOrReadPublished(BasePermission):
    """Catalog access: anyone authenticated reads published items; staff manage all."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_staff:
            return True
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return getattr(obj, "status", None) == "published"
        return False
