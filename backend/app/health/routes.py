"""Liveness and readiness endpoints (12_DEPLOY.md §10).

These endpoints live outside /api/v1/ because they are an operational contract,
not part of the public API contract of 05_API.md. For the same reason they do NOT
use the AD-16 envelope: 12_DEPLOY.md §10 fixes their exact response bodies.

The route delegates every probe to `infrastructure/`; it holds no logic itself.
"""

from flask import Blueprint, jsonify

from ..infrastructure.database import check_connection, check_schema_is_current
from ..infrastructure.storage import LocalStorage

health_bp = Blueprint("health", __name__, url_prefix="/health")


@health_bp.get("/live")
def live():
    """Liveness: the process answers without touching any dependency."""
    return jsonify({"status": "ok"}), 200


@health_bp.get("/ready")
def ready():
    """Readiness: database, migration state and image storage are usable."""
    checks = {
        "database": check_connection(),
        "migrations": check_schema_is_current(),
        "storage": LocalStorage().is_writable(),
    }
    healthy = all(checks.values())
    body = {"status": "ok" if healthy else "error", "checks": checks}
    return jsonify(body), (200 if healthy else 503)
