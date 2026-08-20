"""Authentication and authorization errors (03_SEGURIDAD.md §5, §6)."""

from .base import AppException


class AuthenticationError(AppException):
    """401 — no identity: the session is missing, invalid or expired."""

    status_code = 401
    code = "authentication_required"
    default_detail = "session not found or expired"


class AuthorizationError(AppException):
    """403 — there is an identity, but it lacks the required privilege."""

    status_code = 403
    code = "insufficient_privileges"
    default_detail = "operation not permitted for this role"
