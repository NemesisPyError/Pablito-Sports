"""Route guards for the administrative panel (PA-06, 03_SEGURIDAD.md §6).

PA-06: the backend imposes the real authorisation on every endpoint. The
frontend guard is only a convenience of the interface (07_PANEL_ADMIN.md §8.2).
"""

from functools import wraps

from flask import g


def requires_admin(view):
    """401 when there is no valid session (§6.2)."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        from ...services.admin_auth_service import AdminAuthService

        g.administrator = AdminAuthService.require_administrator()
        return view(*args, **kwargs)

    return wrapper


def requires_super_admin(view):
    """403 when the identity exists but lacks the role (§6.3, RN-67)."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        from ...services.admin_auth_service import AdminAuthService

        g.administrator = AdminAuthService.require_super_administrator()
        return view(*args, **kwargs)

    return wrapper


def current_administrator():
    """The administrator resolved by the guard for the request in flight."""
    return getattr(g, "administrator", None)
