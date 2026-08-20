"""Request-dependent security headers (10_BACKEND.md §11, order 2).

The static headers of 03_SEGURIDAD.md §12 — HSTS, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy and the CSP — are
configured in Nginx. This middleware only complements what depends on the
request, and does not override a header Nginx already set.
"""

from flask import Flask

# BK-06 / 10_BACKEND.md §15.1: no application cache; JSON is never stored.
_PUBLIC_API_CACHE_CONTROL = "no-store, no-cache, must-revalidate"
_PRIVATE_API_CACHE_CONTROL = "no-store, private"

_ADMIN_PREFIX = "/api/v1/admin"
_API_PREFIX = "/api/v1"


def init_app(app: Flask) -> None:
    """Registers the response header middleware."""

    @app.after_request
    def _apply_security_headers(response):
        from flask import request

        path = request.path
        if path.startswith(_ADMIN_PREFIX):
            response.headers.setdefault("Cache-Control", _PRIVATE_API_CACHE_CONTROL)
        elif path.startswith(_API_PREFIX):
            response.headers.setdefault("Cache-Control", _PUBLIC_API_CACHE_CONTROL)

        # Defence in depth: harmless if Nginx already sent them, required if the
        # backend is reached directly (local development, container probes).
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response
