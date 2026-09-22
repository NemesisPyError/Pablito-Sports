"""Gestión de usuarios administradores (05_API.md §9.14).

`RN-67`: todas las rutas de este módulo exigen `super_administrator`, **salvo**
`change-password`, que §9.14 abre al cambio de la contraseña propia y
07_PANEL_ADMIN.md §8.1 marca con ✅ para ambos roles (`CU-A-27`).
"""

from flask import Blueprint, request, session

from ....core.utils.responses import success_response
from ....extensions import limiter
from ....schemas.administrator_schemas import (
    parse_administrator_create,
    parse_administrator_update,
    parse_password_change,
)
from ....schemas.shared import json_body, parse_page_request
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_user_service import SUPER_ADMINISTRATOR, AdminUserService

users_bp = Blueprint("admin_users", __name__)


def _super_required() -> int:
    """§6.3 y `RN-67`: 403 si la identidad existe pero no es superadministrador."""
    return AdminAuthService.require_super_administrator().id


def _session_key() -> str:
    """Clave de límite para `change-password`: **por sesión**, no por IP (§14.1).

    Con la clave por defecto de Flask-Limiter, varias sesiones tras la misma
    salida a internet compartirían cupo y se bloquearían entre sí.
    """
    return getattr(session, "sid", None) or request.remote_addr or "anonymous"


@users_bp.get("/users")
def list_users():
    """GET /api/v1/admin/users (§9.14). Array de `AdministratorDTO`.

    Pagina conforme a §4.4, que vive en "Convenciones y formatos comunes" y por
    tanto alcanza a todo el contrato, y a la consecuencia de `AD-31`: *"no
    existe ningún endpoint que devuelva «todo»"*. `data` sigue siendo el array
    documentado; los totales viajan en `meta`, como exige §4.4.

    Se usa el parser de `schemas/`, que devuelve 422 ante un `page` mal formado
    (§11), en lugar del de `core/utils`, que lo ignora en silencio.
    """
    _super_required()
    page = AdminUserService.list_paginated(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@users_bp.post("/users")
def create_user():
    """POST /api/v1/admin/users (§9.14). `AdministratorDTO` con 201."""
    administrator_id = _super_required()
    entrada = parse_administrator_create(json_body())
    dto = AdminUserService.create(entrada, administrator_id=administrator_id)
    return success_response(dto.to_dict(), status_code=201)


@users_bp.get("/users/<int:user_id>")
def get_user(user_id: int):
    """GET /api/v1/admin/users/{id} (§9.14)."""
    _super_required()
    return success_response(AdminUserService.get_by_id(user_id).to_dict())


@users_bp.put("/users/<int:user_id>")
def update_user(user_id: int):
    """PUT /api/v1/admin/users/{id} (§9.14)."""
    administrator_id = _super_required()
    entrada = parse_administrator_update(json_body())
    dto = AdminUserService.update(user_id, entrada, administrator_id=administrator_id)
    return success_response(dto.to_dict())


@users_bp.delete("/users/<int:user_id>")
def delete_user(user_id: int):
    """DELETE /api/v1/admin/users/{id} (§9.14) → 204; 409 por `RN-71`/`RN-72`."""
    administrator_id = _super_required()
    AdminUserService.delete(user_id, administrator_id=administrator_id)
    # §9.14: 204 sin cuerpo. La envoltura AD-16 no aplica: no hay nada que envolver.
    return "", 204


@users_bp.post("/users/<int:user_id>/change-password")
# 03_SEGURIDAD.md §14.1: 3 intentos cada 15 minutos por sesión.
@limiter.limit("3 per 15 minutes", key_func=_session_key, methods=["POST"])
def change_password(user_id: int):
    """POST /api/v1/admin/users/{id}/change-password (§9.14) → 204.

    Aquí la guarda es `requires_admin`: cualquier administrador autenticado puede
    cambiar **la suya**. Que pueda cambiar la de otro lo decide el servicio, que
    es quien conoce sobre quién se está operando.
    """
    administrador = AdminAuthService.require_administrator()
    entrada = parse_password_change(json_body())
    AdminUserService.change_password(
        user_id,
        entrada,
        administrator_id=administrador.id,
        is_super_administrator=administrador.role == SUPER_ADMINISTRATOR,
    )

    if user_id == administrador.id:
        # §7.3: el cambio de contraseña invalida la sesión, también la propia.
        #
        # El servicio ya retiró del almacén las sesiones del usuario, pero la de
        # *esta* petición sigue viva en memoria y Flask-Session la reescribiría
        # al guardar la respuesta. Cerrarla es cosa de la capa HTTP: `services/`
        # no puede tocar la sesión (10_BACKEND.md §8.4).
        AdminAuthService.logout()

    return "", 204
