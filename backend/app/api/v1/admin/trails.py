"""Lectura de auditoría e historial de precios (05_API.md §9.15, §9.16).

Ambos son visibles para los dos roles: 07_PANEL_ADMIN.md §8.1 marca *Consultar*
con ✅ para Administrador y Superadministrador, y §8.2 fija el rol mínimo en
Administrador para `view_audit_logs` y `view_price_history`.
"""

from flask import Blueprint, request

from ....core.utils.responses import success_response
from ....schemas.admin_trail_schemas import parse_audit_log_query, parse_price_history_query
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_trail_service import AuditTrailService

trails_bp = Blueprint("admin_trails", __name__)


def _admin_required():
    """PA-06: la autorización real la impone el backend en cada endpoint."""
    AdminAuthService.require_administrator()


@trails_bp.get("/audit-logs")
def list_audit_logs():
    """GET /api/v1/admin/audit-logs (§9.15). Solo lectura: `AD-20` la hace inmutable."""
    _admin_required()
    page = AuditTrailService.list_audit_logs(parse_audit_log_query(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@trails_bp.get("/price-history")
def list_price_history():
    """GET /api/v1/admin/price-history (§9.16, `RN-70`)."""
    _admin_required()
    page = AuditTrailService.list_price_history(parse_price_history_query(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())
