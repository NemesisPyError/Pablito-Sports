"""Dashboard del panel (05_API.md §9.2).

07_PANEL_ADMIN.md §8.1 marca "Dashboard · Ver" con ✅ para Administrador y
Superadministrador, y §8.2 fija el permiso `authenticated_admin` con rol mínimo
Administrador. La guarda es por tanto `requires_admin`.

Es una lectura: no lleva token CSRF (03_SEGURIDAD.md §8.3 lo exige en las
escrituras) ni abre transacción (10_BACKEND.md §14.1 regla 3).
"""

from flask import Blueprint

from ....core.utils.responses import success_response
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_dashboard_service import AdminDashboardService

dashboard_bp = Blueprint("admin_dashboard", __name__)


@dashboard_bp.get("/dashboard")
def get_dashboard():
    """GET /api/v1/admin/dashboard (§9.2). `DashboardDTO`, código 200.

    No tiene 404: el recurso es un agregado que siempre existe, aunque el
    catálogo esté vacío, en cuyo caso los totales son cero y las listas quedan
    vacías.
    """
    # PA-06: la autorización real la impone el backend en cada endpoint.
    AdminAuthService.require_administrator()
    return success_response(AdminDashboardService.build().to_dict())
