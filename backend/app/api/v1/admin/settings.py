"""Configuración de la tienda (05_API.md §9.12).

07_PANEL_ADMIN.md §8.1 marca "Configuración · Editar" con ✅ para Administrador
y Superadministrador, y §8.2 fija el rol mínimo en Administrador con el permiso
`manage_store_settings`. La guarda es por tanto `requires_admin`.

§9.13 expone las plantillas de WhatsApp como recurso aparte, sobre las mismas
columnas. Ambas secciones viven aquí porque comparten recurso, guarda y servicio.
"""

from flask import Blueprint, current_app, request

from ....core.exceptions import RequestValidationError
from ....core.utils.responses import success_response
from ....infrastructure.storage.local_storage import LocalStorage
from ....schemas.store_setting_schemas import parse_store_settings, parse_whatsapp_template
from ....services.admin_auth_service import AdminAuthService
from ....services.store_setting_service import StoreSettingService

settings_bp = Blueprint("admin_settings", __name__)


def _admin_required() -> int:
    """PA-06: la autorización real la impone el backend en cada endpoint.

    Devuelve el identificador porque toda escritura queda atribuida en
    `audit_logs` (`AD-20`) y el servicio no puede leer la sesión (§8.4).
    """
    return AdminAuthService.require_administrator().id


@settings_bp.get("/store/settings")
def get_store_settings():
    """GET /api/v1/admin/store/settings (§9.12). `StoreSettingsAdminDTO`."""
    _admin_required()
    return success_response(StoreSettingService.get_admin().to_dict())


@settings_bp.put("/store/settings")
def update_store_settings():
    """PUT /api/v1/admin/store/settings (§9.12). `StoreSettingsAdminDTO`."""
    administrator_id = _admin_required()
    entrada = parse_store_settings(request.get_json(silent=True) or {})
    dto = StoreSettingService.update(entrada, administrator_id=administrator_id)
    return success_response(dto.to_dict())


# --- Foto de «Nuestra historia» (§9.12, v1.1.0) -------------------------


@settings_bp.put("/store/about-image")
def set_about_image():
    """PUT /api/v1/admin/store/about-image (§9.12).

    Recurso aparte porque el `PUT` de la configuración es JSON: volverlo
    `multipart` entero obligaría a reenviar las plantillas de WhatsApp cada vez
    que se cambia una foto.

    `AD-40`: el archivo se escribe antes que la fila, de modo que el
    almacenamiento ocurre acá, fuera de la transacción del servicio.
    """
    administrator_id = _admin_required()

    archivo = request.files.get("image")
    if archivo is None or not (archivo.filename or "").strip():
        raise RequestValidationError([{"field": "image", "detail": "image is required"}])

    storage = LocalStorage(current_app.config["UPLOAD_FOLDER"])
    image_path = storage.save_store_image(archivo)

    dto = StoreSettingService.set_about_image(image_path, administrator_id=administrator_id)
    return success_response(dto.to_dict())


@settings_bp.delete("/store/about-image")
def delete_about_image():
    """DELETE /api/v1/admin/store/about-image (§9.12).

    Quita la foto sin tocar el texto. El archivo **no se borra del volumen**:
    `AD-39` acota la limpieza física a los archivos sin fila, y el criterio de
    §9.11 para banners es el mismo.
    """
    administrator_id = _admin_required()
    dto = StoreSettingService.set_about_image(None, administrator_id=administrator_id)
    return success_response(dto.to_dict())


# --- Plantilla de WhatsApp (§9.13) --------------------------------------


@settings_bp.get("/store/whatsapp-template")
def get_whatsapp_template():
    """GET /api/v1/admin/store/whatsapp-template (§9.13). `WhatsAppTemplateDTO`."""
    _admin_required()
    return success_response(StoreSettingService.get_whatsapp_template().to_dict())


@settings_bp.put("/store/whatsapp-template")
def update_whatsapp_template():
    """PUT /api/v1/admin/store/whatsapp-template (§9.13).

    §9.13 fija la validación en las variables requeridas (`RF-41`, `RN-60`); la
    aplica `parse_whatsapp_template`.
    """
    administrator_id = _admin_required()
    entrada = parse_whatsapp_template(request.get_json(silent=True) or {})
    dto = StoreSettingService.update_whatsapp_template(entrada, administrator_id=administrator_id)
    return success_response(dto.to_dict())


@settings_bp.post("/store/whatsapp-template/reset")
def reset_whatsapp_template():
    """POST /api/v1/admin/store/whatsapp-template/reset (§9.13). `RN-61`.

    §9.13 no fija código de respuesta: se devuelve 200 con la plantilla ya
    restaurada, que es lo que la sección declara como salida.
    """
    administrator_id = _admin_required()
    dto = StoreSettingService.reset_whatsapp_template(administrator_id=administrator_id)
    return success_response(dto.to_dict())
