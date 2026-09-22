"""Promociones del panel (05_API.md §9.10).

07_PANEL_ADMIN.md §8.1 marca "Promociones · CRUD completo" con ✅ para
Administrador y Superadministrador, y §8.2 fija el rol mínimo en Administrador
con el permiso `manage_promotions`. La guarda es por tanto `requires_admin`.
"""

from flask import Blueprint, request

from ....core.utils.responses import success_response
from ....schemas.promotion_schemas import parse_promotion
from ....schemas.shared import json_body, parse_page_request
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_promotion_service import AdminPromotionService

promotions_bp = Blueprint("admin_promotions", __name__)


def _admin_required() -> int:
    """PA-06: la autorización real la impone el backend en cada endpoint.

    Devuelve el identificador porque toda escritura queda atribuida en
    `audit_logs` (`AD-20`) y el servicio no puede leer la sesión (§8.4).
    """
    return AdminAuthService.require_administrator().id


@promotions_bp.get("/promotions")
def list_promotions():
    """GET /api/v1/admin/promotions (§9.10). Listado paginado."""
    _admin_required()
    page = AdminPromotionService.list_paginated(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@promotions_bp.post("/promotions")
def create_promotion():
    """POST /api/v1/admin/promotions (§9.10)."""
    administrator_id = _admin_required()
    entrada = parse_promotion(json_body())
    dto = AdminPromotionService.create(entrada, administrator_id=administrator_id)
    return success_response(dto.to_dict(), status_code=201)


@promotions_bp.get("/promotions/<int:promotion_id>")
def get_promotion(promotion_id: int):
    """GET /api/v1/admin/promotions/{id} (§9.10)."""
    _admin_required()
    return success_response(AdminPromotionService.get_by_id(promotion_id).to_dict())


@promotions_bp.put("/promotions/<int:promotion_id>")
def update_promotion(promotion_id: int):
    """PUT /api/v1/admin/promotions/{id} (§9.10)."""
    administrator_id = _admin_required()
    entrada = parse_promotion(json_body())
    dto = AdminPromotionService.update(promotion_id, entrada, administrator_id=administrator_id)
    return success_response(dto.to_dict())


@promotions_bp.delete("/promotions/<int:promotion_id>")
def delete_promotion(promotion_id: int):
    """DELETE /api/v1/admin/promotions/{id} (§9.10). Borrado lógico.

    §9.10 **no fija código de respuesta**, a diferencia de §9.3, §9.5 y §9.14,
    que sí exigen 204. Se devuelve 200 con el recurso eliminado, que es lo que
    ya hacen las clasificaciones —el otro caso con el código sin fijar— para no
    introducir por iniciativa propia un contrato que el documento calla.
    """
    administrator_id = _admin_required()
    dto = AdminPromotionService.delete(promotion_id, administrator_id=administrator_id)
    return success_response(dto.to_dict())
