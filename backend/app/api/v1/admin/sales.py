"""Registro manual de ventas desde el panel (05_API.md §9.19).

Una venta puede tener varias líneas, cada una sobre una variante concreta. Todo
el registro —cabecera, líneas y descuento de stock— ocurre en una sola
transacción, que abre el servicio: si una línea se queda sin stock, no se
descuenta ninguna.

**No hay versión pública de esto.** El recurso vive bajo `/api/v1/admin`, detrás
de `require_administrator`, como el resto del panel.
"""

from flask import Blueprint, request, session

from ....core.utils.responses import success_response
from ....extensions import limiter
from ....schemas.sale_schemas import parse_manual_sale
from ....schemas.shared import json_body
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_product_service import AdminProductService

sales_bp = Blueprint("admin_sales", __name__)


def _admin_required() -> int:
    """PA-06: la autorización la impone el backend, no el panel.

    Devuelve el identificador porque la venta queda atribuida a quien la
    registró —en `sale_orders.administrator_id`, en cada fila de `sales` y en
    `audit_logs`— y el servicio no puede leer la sesión (10_BACKEND.md §8.4).
    """
    return AdminAuthService.require_administrator().id


def _session_key() -> str:
    """Cupo **por sesión**, no por IP.

    Mismo criterio que `change-password` en `users.py`: con la clave por
    defecto, varios administradores tras la misma salida a internet compartirían
    cupo y se estorbarían entre ellos.
    """
    return getattr(session, "sid", None) or request.remote_addr or "anonymous"


@sales_bp.post("/sales")
# Registrar una venta es una operación humana: se cuentan en decenas por día,
# no en cientos por minuto. El límite acota un panel comprometido o un botón
# que se dispara en bucle, sin estorbar el uso real.
@limiter.limit("60 per minute", key_func=_session_key, methods=["POST"])
def register_manual_sale():
    """POST /api/v1/admin/sales → 201 con la venta registrada.

    Errores: 422 si el cuerpo no valida, 404 si el producto o la variante no
    existen, 409 (`BusinessRuleError`) si alguna línea supera el stock. En los
    tres casos no queda nada escrito.
    """
    administrator_id = _admin_required()
    lineas = parse_manual_sale(json_body())
    venta = AdminProductService.register_manual_sale(lineas, administrator_id=administrator_id)
    return success_response(venta, status_code=201)
