"""Conversión de modelo a DTO para auditoría e historial de precios.

Transformaciones puras: sin lógica de negocio y sin tocar la base de datos
(10_BACKEND.md §8.8).
"""

from ..core.utils.urls import public_file_url
from ..dtos.admin_dtos import (
    AdministratorDTO,
    AdministratorMinimalDTO,
    AdministratorProfileDTO,
    AuditLogDTO,
    BannerAdminDTO,
    GenderAdminDTO,
    PriceHistoryDTO,
    PromotionDTO,
    PromotionScopeDTO,
    SizeTypeAdminDTO,
    StoreSettingsAdminDTO,
    WhatsAppTemplateDTO,
)
from ..dtos.common_dtos import NamedEntityDTO


def gender_to_admin_dto(gender) -> GenderAdminDTO:
    """§10.7 `GenderAdminDTO`."""
    return GenderAdminDTO(id=gender.id, slug=gender.slug, name=gender.name)


def size_type_to_admin_dto(size_type) -> SizeTypeAdminDTO:
    """§10.7 `SizeTypeAdminDTO`."""
    return SizeTypeAdminDTO(id=size_type.id, slug=size_type.slug, name=size_type.name)


def store_settings_to_whatsapp_template_dto(settings) -> WhatsAppTemplateDTO:
    """§10.x `WhatsAppTemplateDTO`. Mismas columnas que §10.2, otra puerta."""
    return WhatsAppTemplateDTO(
        message_template=settings.message_template,
        item_template=settings.item_template,
    )


def store_settings_to_admin_dto(settings) -> StoreSettingsAdminDTO:
    """§10.x `StoreSettingsAdminDTO`."""
    return StoreSettingsAdminDTO(
        store_name=settings.store_name,
        whatsapp_number=settings.whatsapp_number,
        email=settings.email,
        address=settings.address,
        business_hours=settings.business_hours,
        social_links=settings.social_links,
        about_title=settings.about_title,
        about_text=settings.about_text,
        about_image_url=public_file_url(settings.about_image_path),
        message_template=settings.message_template,
        item_template=settings.item_template,
        featured_products_count=settings.featured_products_count,
    )


def banner_to_admin_dto(banner) -> BannerAdminDTO:
    """§10.3 `BannerAdminDTO`.

    `image_url` es la URL pública del derivado canónico, no la ruta almacenada
    (§4.9, §17.1.6).
    """
    return BannerAdminDTO(
        id=banner.id,
        title=banner.title,
        subtitle=banner.subtitle,
        image_url=public_file_url(banner.image_path),
        link_url=banner.link_url,
        button_label=banner.button_label,
        placement=banner.placement,
        position=banner.position,
        starts_at=banner.starts_at.isoformat() if banner.starts_at else None,
        ends_at=banner.ends_at.isoformat() if banner.ends_at else None,
        is_active=banner.is_active,
    )


# §10.9: el tipo de alcance se deduce de qué columna está poblada. `RN-36` y el
# CHECK `scope_exclusive` garantizan que sea exactamente una.
_SCOPES = (("product", "product"), ("category", "category"), ("brand", "brand"))


def promotion_to_dto(promotion) -> PromotionDTO:
    """§10.9 `PromotionDTO`."""
    return PromotionDTO(
        id=promotion.id,
        name=promotion.name,
        description=promotion.description,
        discount_percentage=promotion.discount_percentage,
        starts_at=promotion.starts_at.isoformat(),
        ends_at=promotion.ends_at.isoformat() if promotion.ends_at else None,
        is_active=promotion.is_active,
        scope=_promotion_scope(promotion),
    )


def _promotion_scope(promotion) -> PromotionScopeDTO:
    for tipo, atributo in _SCOPES:
        entidad = getattr(promotion, atributo)
        if entidad is not None:
            return PromotionScopeDTO(
                type=tipo, entity=NamedEntityDTO(slug=entidad.slug, name=entidad.name)
            )
    # Inalcanzable mientras el CHECK `scope_exclusive` siga en la tabla: una
    # promoción sin alcance no puede existir.
    raise ValueError(f"promotion {promotion.id} has no scope, which RN-36 forbids")


def administrator_to_minimal_dto(administrator) -> AdministratorMinimalDTO:
    return AdministratorMinimalDTO(id=administrator.id, username=administrator.username)


def administrator_to_profile_dto(administrator) -> AdministratorProfileDTO:
    """§10.10. El hash de contraseña no se mapea: nunca sale del servidor."""
    return AdministratorProfileDTO(
        id=administrator.id,
        username=administrator.username,
        email=administrator.email,
        role=administrator.role,
        last_login_at=(
            administrator.last_login_at.isoformat() if administrator.last_login_at else None
        ),
    )


def administrator_to_dto(administrator) -> AdministratorDTO:
    """§10.10 `AdministratorDTO`, con el estado administrativo completo."""
    return AdministratorDTO(
        id=administrator.id,
        username=administrator.username,
        email=administrator.email,
        role=administrator.role,
        last_login_at=(
            administrator.last_login_at.isoformat() if administrator.last_login_at else None
        ),
        is_active=administrator.is_active,
        created_at=administrator.created_at.isoformat(),
        updated_at=administrator.updated_at.isoformat(),
        deleted_at=administrator.deleted_at.isoformat() if administrator.deleted_at else None,
    )


def audit_log_to_dto(entry) -> AuditLogDTO:
    return AuditLogDTO(
        id=entry.id,
        administrator=administrator_to_minimal_dto(entry.administrator),
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        old_values=entry.old_values,
        new_values=entry.new_values,
        # INET se materializa como objeto de red; el contrato pide texto.
        ip_address=str(entry.ip_address) if entry.ip_address else None,
        created_at=entry.created_at.isoformat(),
    )


def price_history_to_dto(entry) -> PriceHistoryDTO:
    return PriceHistoryDTO(
        id=entry.id,
        product=NamedEntityDTO(slug=entry.product.slug, name=entry.product.name),
        old_price=entry.old_price,
        new_price=entry.new_price,
        administrator=administrator_to_minimal_dto(entry.administrator),
        created_at=entry.created_at.isoformat(),
    )
