"""Store configuration rules (PA-10, RN-58 to RN-61).

`RN-58`: el número de WhatsApp destino se configura desde el panel. `RN-59`: la
plantilla del mensaje es editable y no está fija en el código. `RN-60`: las
variables obligatorias se validan antes de guardar, en el schema de entrada.

La escritura corre bajo `@transactional` (10_BACKEND.md §14.1) y deja registro
en `audit_logs` dentro de la misma transacción (`AD-20`, `CONS-05`).
"""

from ..core.audit import ACTION_UPDATE, AuditService
from ..core.decorators import transactional
from ..core.exceptions import NotFoundError
from ..core.utils.whatsapp_defaults import DEFAULT_ITEM_TEMPLATE, DEFAULT_MESSAGE_TEMPLATE
from ..dtos.admin_dtos import StoreSettingsAdminDTO, WhatsAppTemplateDTO
from ..dtos.catalog_dtos import StoreAboutDTO, StoreSettingsPublicDTO
from ..mappers.admin_mappers import (
    store_settings_to_admin_dto,
    store_settings_to_whatsapp_template_dto,
)
from ..mappers.catalog_mappers import store_settings_to_about_dto, store_settings_to_public_dto
from ..repositories.store_setting_repository import StoreSettingRepository

ENTITY_TYPE = "store_settings"

# 04 §9.2.14: `featured_products_count INTEGER NOT NULL DEFAULT 8`.
DEFAULT_FEATURED_PRODUCTS_COUNT = 8

# §9.2.14: fila única, id = 1. La auditoría necesita un identificador y este es
# el que la tabla garantiza.
SINGLETON_ID = 1

# §14.2: snapshot selectivo. `updated_at` queda fuera: lo mantiene la base y no
# es un cambio que el administrador haya decidido.
AUDIT_FIELDS = (
    "store_name",
    "whatsapp_number",
    "email",
    "address",
    "business_hours",
    "social_links",
    "about_title",
    "about_text",
    "about_image_path",
    "message_template",
    "item_template",
    "featured_products_count",
)


class StoreSettingService:
    @staticmethod
    def get_public() -> StoreSettingsPublicDTO:
        """§7.1: 404 while the configuration has not been initialised."""
        return store_settings_to_public_dto(StoreSettingService._require())

    @staticmethod
    def get_about() -> StoreAboutDTO:
        """§7.2b `GET /store/about`.

        404 mientras la configuración no esté inicializada, igual que §7.1. Que
        los cuatro campos estén vacíos **no** es un 404: la configuración
        existe, la sección todavía no se cargó.
        """
        return store_settings_to_about_dto(StoreSettingService._require())

    @staticmethod
    def get_admin() -> StoreSettingsAdminDTO:
        """§9.12 `GET /admin/store/settings`."""
        return store_settings_to_admin_dto(StoreSettingService._require())

    @staticmethod
    def featured_products_count() -> int:
        """Cuántos destacados publica la portada (`RF-35`, 04 §9.2.14).

        Es un ajuste **del panel**: no viaja en `StoreSettingsPublicDTO` (§10.2)
        y por tanto el cliente no lo conoce. Lo aplica el servidor al paginar,
        que es quien puede leerlo sin ampliar el contrato público.

        Sin configuración inicializada se cae en el mismo valor que la columna
        declara por defecto: una portada vacía sería peor que una con el número
        de fábrica.
        """
        settings = StoreSettingRepository.get_singleton()
        if settings is None or not settings.featured_products_count:
            return DEFAULT_FEATURED_PRODUCTS_COUNT
        return settings.featured_products_count

    @classmethod
    @transactional
    def update(cls, entrada, *, administrator_id: int) -> StoreSettingsAdminDTO:
        """§9.12 `PUT /admin/store/settings`.

        `PUT` reemplaza el recurso completo: los opcionales ausentes quedan en
        `NULL`. No hay alta —§9.2.14 fija una fila única que la migración
        siembra—, de modo que una configuración sin inicializar es `404` y no un
        insert silencioso.
        """
        settings = cls._require()
        old_values = AuditService.snapshot(settings, AUDIT_FIELDS)

        settings = StoreSettingRepository.update(
            settings,
            store_name=entrada.store_name,
            whatsapp_number=entrada.whatsapp_number,
            email=entrada.email,
            address=entrada.address,
            business_hours=entrada.business_hours,
            social_links=entrada.social_links,
            about_title=entrada.about_title,
            about_text=entrada.about_text,
            message_template=entrada.message_template,
            item_template=entrada.item_template,
            featured_products_count=entrada.featured_products_count,
        )

        AuditService.record(
            administrator_id=administrator_id,
            # El conjunto de `action` es cerrado (03_SEGURIDAD.md §13.2) y la
            # configuración no se activa ni se desactiva: siempre es `update`.
            action=ACTION_UPDATE,
            entity_type=ENTITY_TYPE,
            entity_id=SINGLETON_ID,
            old_values=old_values,
            new_values=AuditService.snapshot(settings, AUDIT_FIELDS),
        )
        return store_settings_to_admin_dto(settings)

    @classmethod
    @transactional
    def set_about_image(cls, image_path: str | None, *, administrator_id: int):
        """§9.12 `PUT` / `DELETE /admin/store/about-image` (v1.1.0).

        La foto viaja aparte del resto de la configuración: el `PUT` de §9.12
        es JSON y volverlo `multipart` entero por un único campo obligaría a
        reenviar las plantillas de WhatsApp en cada carga de imagen.

        `image_path` nulo **sí** borra: a diferencia de la imagen de banner en
        §9.11, acá el endpoint de baja es explícito y no hay ambigüedad entre
        "no la reemplazo" y "la quito".
        """
        settings = cls._require()
        old_values = AuditService.snapshot(settings, AUDIT_FIELDS)

        settings = StoreSettingRepository.update(settings, about_image_path=image_path)

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type=ENTITY_TYPE,
            entity_id=SINGLETON_ID,
            old_values=old_values,
            new_values=AuditService.snapshot(settings, AUDIT_FIELDS),
        )
        return store_settings_to_admin_dto(settings)

    # --- Plantilla de WhatsApp (§9.13) --------------------------------
    #
    # Recurso separado sobre las mismas columnas. Toda escritura pasa por
    # `_guardar_plantillas`, de modo que auditoría y transacción son idénticas
    # a las de §9.12 y las dos puertas no pueden divergir.

    @staticmethod
    def get_whatsapp_template() -> WhatsAppTemplateDTO:
        """§9.13 `GET /store/whatsapp-template`."""
        return store_settings_to_whatsapp_template_dto(StoreSettingService._require())

    @classmethod
    def update_whatsapp_template(cls, entrada, *, administrator_id: int) -> WhatsAppTemplateDTO:
        """§9.13 `PUT /store/whatsapp-template`."""
        return cls._guardar_plantillas(
            message_template=entrada.message_template,
            item_template=entrada.item_template,
            administrator_id=administrator_id,
        )

    @classmethod
    def reset_whatsapp_template(cls, *, administrator_id: int) -> WhatsAppTemplateDTO:
        """§9.13 `POST /store/whatsapp-template/reset`. `RN-61`.

        Restaura la plantilla de 01_ANALISIS_NEGOCIO.md §12.3. Es una escritura
        como cualquier otra: queda auditada, para que el historial muestre qué
        había antes de restaurar.
        """
        return cls._guardar_plantillas(
            message_template=DEFAULT_MESSAGE_TEMPLATE,
            item_template=DEFAULT_ITEM_TEMPLATE,
            administrator_id=administrator_id,
        )

    @classmethod
    @transactional
    def _guardar_plantillas(
        cls, *, message_template: str, item_template: str, administrator_id: int
    ) -> WhatsAppTemplateDTO:
        settings = cls._require()
        old_values = AuditService.snapshot(settings, AUDIT_FIELDS)

        settings = StoreSettingRepository.update(
            settings,
            message_template=message_template,
            item_template=item_template,
        )

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type=ENTITY_TYPE,
            entity_id=SINGLETON_ID,
            old_values=old_values,
            new_values=AuditService.snapshot(settings, AUDIT_FIELDS),
        )
        return store_settings_to_whatsapp_template_dto(settings)

    # ------------------------------------------------------------------

    @staticmethod
    def _require():
        settings = StoreSettingRepository.get_singleton()
        if settings is None:
            raise NotFoundError("store settings not initialised", resource="store_settings")
        return settings
