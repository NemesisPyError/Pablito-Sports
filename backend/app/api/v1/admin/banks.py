"""Bancos de Superdescuentos del panel.

Mismo criterio de guarda que `banners.py`/`promotions.py`: cualquier
administrador autenticado (`PA-06`), sin permiso fino adicional.

La entrada viaja como `multipart/form-data` porque `image` es un archivo. La
imagen se almacena en el espacio de nombres `banks`.
"""

from flask import Blueprint, current_app, request

from ....core.exceptions import RequestValidationError
from ....core.utils.responses import success_response
from ....infrastructure.storage.local_storage import LocalStorage
from ....schemas.bank_schemas import parse_bank
from ....schemas.shared import parse_page_request
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_bank_service import AdminBankService

banks_bp = Blueprint("admin_banks", __name__)


def _admin_required() -> int:
    """PA-06: la autorización real la impone el backend en cada endpoint."""
    return AdminAuthService.require_administrator().id


def _store_image(*, obligatoria: bool) -> str | None:
    """Valida y almacena la imagen; devuelve su ruta, o `None` si no vino.

    Obligatoria al crear, omitible al editar si no se reemplaza. El archivo se
    escribe **antes** que la fila (`AD-40`).
    """
    archivo = request.files.get("image")
    if archivo is None or not archivo.filename:
        if obligatoria:
            raise RequestValidationError([{"field": "image", "detail": "image is required"}])
        return None

    storage = LocalStorage(current_app.config["UPLOAD_FOLDER"])
    return storage.save_bank_image(archivo)


@banks_bp.get("/banks")
def list_banks():
    """GET /api/v1/admin/banks. Array de `BankAdminDTO`."""
    _admin_required()
    page = AdminBankService.list_paginated(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@banks_bp.post("/banks")
def create_bank():
    """POST /api/v1/admin/banks. `BankAdminDTO` con 201."""
    administrator_id = _admin_required()
    entrada = parse_bank(request.form)
    # La forma se valida antes de tocar el disco: un payload inválido no debe
    # dejar un archivo huérfano.
    image_path = _store_image(obligatoria=True)
    dto = AdminBankService.create(entrada, image_path=image_path, administrator_id=administrator_id)
    return success_response(dto.to_dict(), status_code=201)


@banks_bp.get("/banks/<int:bank_id>")
def get_bank(bank_id: int):
    """GET /api/v1/admin/banks/{id}."""
    _admin_required()
    return success_response(AdminBankService.get_by_id(bank_id).to_dict())


@banks_bp.put("/banks/<int:bank_id>")
def update_bank(bank_id: int):
    """PUT /api/v1/admin/banks/{id}."""
    administrator_id = _admin_required()
    entrada = parse_bank(request.form)
    image_path = _store_image(obligatoria=False)
    dto = AdminBankService.update(
        bank_id, entrada, image_path=image_path, administrator_id=administrator_id
    )
    return success_response(dto.to_dict())


@banks_bp.delete("/banks/<int:bank_id>")
def delete_bank(bank_id: int):
    """DELETE /api/v1/admin/banks/{id}. Borrado lógico.

    Mismo criterio que banners/promociones: no se fija 204, se devuelve 200
    con el recurso eliminado.
    """
    administrator_id = _admin_required()
    dto = AdminBankService.delete(bank_id, administrator_id=administrator_id)
    return success_response(dto.to_dict())
