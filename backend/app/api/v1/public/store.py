"""Store settings, WhatsApp template and banner endpoints (05_API.md §7.1, §7.2).

La plantilla se expone como **recurso propio** y no dentro de
`StoreSettingsPublicDTO`: §10.2 fija ese DTO con cinco campos exactos y `AD-12`
gobierna qué sale al contrato público. Ampliarlo habría cambiado un contrato
congelado; un recurso aparte lo deja intacto.

`RN-59` exige que la plantilla que edita el administrador sea la que compone el
mensaje del cliente. Sin este endpoint el catálogo no tenía forma de leerla y
usaba siempre la de por defecto, de modo que la regla quedaba incumplida de
punta a punta.
"""

from flask import Blueprint, request

from ....core.utils.responses import success_response
from ....services.bank_service import BankService
from ....services.banner_service import BannerService
from ....services.catalog_service import CatalogService
from ....services.store_setting_service import StoreSettingService

store_bp = Blueprint("store", __name__)
banners_bp = Blueprint("banners", __name__)
banks_bp = Blueprint("banks", __name__)


@store_bp.get("/store/settings")
def get_store_settings():
    """§7.1: 404 while the configuration has not been initialised."""
    settings = StoreSettingService.get_public()
    return success_response(settings.to_dict())


@store_bp.get("/store/whatsapp-template")
def get_public_whatsapp_template():
    """Plantilla vigente del mensaje de WhatsApp (`RN-59`).

    Devuelve **solo** `message_template` e `item_template`: es el mismo
    `WhatsAppTemplateDTO` que sirve §9.13 al panel, de modo que el cliente y el
    administrador no pueden ver plantillas distintas.

    El resto de la configuración de panel —contador de destacados incluido— no
    entra aquí: sigue siendo privada.

    404 mientras la configuración no esté inicializada, igual que §7.1.
    """
    return success_response(StoreSettingService.get_whatsapp_template().to_dict())


@store_bp.get("/store/about")
def get_store_about():
    """§7.2b: historia de la tienda y correo de contacto.

    Recurso propio y no parte de `StoreSettingsPublicDTO`, que `AD-12` congela
    en cinco campos: es el mismo criterio de la plantilla de WhatsApp.

    404 mientras la configuración no esté inicializada, igual que §7.1.
    """
    return success_response(StoreSettingService.get_about().to_dict())


@store_bp.get("/store/brand-showcases")
def list_brand_showcases():
    """§7.2c: marcas con bloque propio en la portada, por `home_position`."""
    showcases = CatalogService.list_brand_showcases()
    return success_response([showcase.to_dict() for showcase in showcases])


@banners_bp.get("/banners")
def list_banners():
    """§7.2: active and in-force banners, ordered by position.

    `placement` acota la zona de la portada. Sin el parámetro se devuelven
    todas, igual que antes de la v1.1.0.
    """
    placement = (request.args.get("placement") or "").strip() or None
    banners = BannerService.list_public(placement=placement)
    return success_response([banner.to_dict() for banner in banners])


@banks_bp.get("/banks")
def list_banks():
    """Superdescuentos: bancos activos, ordenados por posición."""
    banks = BankService.list_public()
    return success_response([bank.to_dict() for bank in banks])
