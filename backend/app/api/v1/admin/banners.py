"""Banners del panel (05_API.md §9.11).

07_PANEL_ADMIN.md §8.1 marca "Banners · CRUD completo" con ✅ para Administrador
y Superadministrador, y §8.2 fija el rol mínimo en Administrador con el permiso
`manage_banners`. La guarda es por tanto `requires_admin`.

La entrada viaja como `multipart/form-data` porque `image` es un archivo
(§10.13). La imagen se almacena en el espacio de nombres `banners` de
`99_AI_DEVELOPMENT_GUIDE.md` §17.1.
"""

from flask import Blueprint, current_app, request

from ....core.exceptions import RequestValidationError
from ....core.utils.responses import success_response
from ....infrastructure.storage.local_storage import LocalStorage
from ....schemas.banner_schemas import parse_banner
from ....schemas.shared import parse_page_request
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_banner_service import AdminBannerService

banners_bp = Blueprint("admin_banners", __name__)


def _admin_required() -> int:
    """PA-06: la autorización real la impone el backend en cada endpoint."""
    return AdminAuthService.require_administrator().id


def _store_image(*, obligatoria: bool) -> str | None:
    """Valida y almacena la imagen; devuelve su ruta, o `None` si no vino.

    §10.13: obligatoria al crear, omitible al editar si no se reemplaza. El
    archivo se escribe **antes** que la fila (`AD-40`), de modo que esto ocurre
    fuera de la transacción del servicio.
    """
    archivo = request.files.get("image")
    if archivo is None or not archivo.filename:
        if obligatoria:
            raise RequestValidationError([{"field": "image", "detail": "image is required"}])
        return None

    storage = LocalStorage(current_app.config["UPLOAD_FOLDER"])
    return storage.save_banner(archivo)


@banners_bp.get("/banners")
def list_banners():
    """GET /api/v1/admin/banners (§9.11). Array de `BannerAdminDTO`.

    `placement` acota la zona, para administrar hero, novedades y promociones
    por separado sin tres pantallas distintas.
    """
    _admin_required()
    placement = (request.args.get("placement") or "").strip() or None
    page = AdminBannerService.list_paginated(parse_page_request(request.args), placement)
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@banners_bp.post("/banners")
def create_banner():
    """POST /api/v1/admin/banners (§9.11). `BannerAdminDTO` con 201."""
    administrator_id = _admin_required()
    entrada = parse_banner(request.form)
    # La forma se valida antes de tocar el disco: un payload inválido no debe
    # dejar un archivo huérfano.
    image_path = _store_image(obligatoria=True)
    dto = AdminBannerService.create(
        entrada, image_path=image_path, administrator_id=administrator_id
    )
    return success_response(dto.to_dict(), status_code=201)


@banners_bp.get("/banners/<int:banner_id>")
def get_banner(banner_id: int):
    """GET /api/v1/admin/banners/{id} (§9.11)."""
    _admin_required()
    return success_response(AdminBannerService.get_by_id(banner_id).to_dict())


@banners_bp.put("/banners/<int:banner_id>")
def update_banner(banner_id: int):
    """PUT /api/v1/admin/banners/{id} (§9.11)."""
    administrator_id = _admin_required()
    entrada = parse_banner(request.form)
    image_path = _store_image(obligatoria=False)
    dto = AdminBannerService.update(
        banner_id, entrada, image_path=image_path, administrator_id=administrator_id
    )
    return success_response(dto.to_dict())


@banners_bp.delete("/banners/<int:banner_id>")
def delete_banner(banner_id: int):
    """DELETE /api/v1/admin/banners/{id} (§9.11). Borrado lógico.

    §9.11 devuelve `BannerAdminDTO`, mismo criterio que Promociones (§9.10):
    ninguna de las dos secciones fija 204, a diferencia de §9.3, §9.5 y §9.14.
    """
    administrator_id = _admin_required()
    dto = AdminBannerService.delete(banner_id, administrator_id=administrator_id)
    return success_response(dto.to_dict())
