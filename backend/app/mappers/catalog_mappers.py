"""Model to DTO conversion for classifications, banners and store settings.

Mappers are pure transformations: they hold no business logic and never touch the
database (10_BACKEND.md §8.8).
"""

from ..core.utils.urls import public_file_url
from ..dtos.catalog_dtos import (
    BannerDTO,
    BrandDTO,
    BrandImageDTO,
    BrandShowcaseDTO,
    CategoryTreeDTO,
    GenderDTO,
    SizeDTO,
    SizeTypeDTO,
    SportDTO,
    StoreAboutDTO,
    StoreSettingsPublicDTO,
)
from ..dtos.common_dtos import NamedEntityDTO


def to_named_entity(entity) -> NamedEntityDTO:
    return NamedEntityDTO(slug=entity.slug, name=entity.name)


def brand_to_dto(brand) -> BrandDTO:
    return BrandDTO(slug=brand.slug, name=brand.name, image_url=public_file_url(brand.image_path))


def brand_image_to_dto(image) -> BrandImageDTO:
    return BrandImageDTO(
        image_url=public_file_url(image.file_path),
        alt_text=image.alt_text,
        position=image.position,
    )


def brand_to_showcase_dto(brand, images) -> BrandShowcaseDTO:
    """§7.2c. Las piezas llegan ya filtradas y ordenadas desde el repositorio:
    el mapper no consulta la base ni decide qué es visible (10 §8.8).
    """
    return BrandShowcaseDTO(
        slug=brand.slug,
        name=brand.name,
        image_url=public_file_url(brand.image_path),
        tagline=brand.tagline,
        position=brand.home_position,
        images=[brand_image_to_dto(image) for image in images],
    )


def sport_to_dto(sport) -> SportDTO:
    return SportDTO(slug=sport.slug, name=sport.name)


def gender_to_dto(gender) -> GenderDTO:
    return GenderDTO(slug=gender.slug, name=gender.name)


def size_type_to_dto(size_type) -> SizeTypeDTO:
    return SizeTypeDTO(slug=size_type.slug, name=size_type.name)


def size_to_dto(size) -> SizeDTO:
    return SizeDTO(slug=size.slug, name=size.name, size_type=to_named_entity(size.size_type))


def category_to_tree_dto(category, children) -> CategoryTreeDTO:
    return CategoryTreeDTO(
        slug=category.slug,
        name=category.name,
        children=[to_named_entity(child) for child in children],
    )


def banner_to_dto(banner) -> BannerDTO:
    return BannerDTO(
        title=banner.title,
        subtitle=banner.subtitle,
        image_url=public_file_url(banner.image_path),
        link_url=banner.link_url,
        button_label=banner.button_label,
        placement=banner.placement,
        position=banner.position,
    )


def store_settings_to_about_dto(settings) -> StoreAboutDTO:
    """§7.2b. Recurso propio, para no ampliar el DTO congelado por `AD-12`."""
    return StoreAboutDTO(
        about_title=settings.about_title,
        about_text=settings.about_text,
        about_image_url=public_file_url(settings.about_image_path),
        email=settings.email,
    )


def store_settings_to_public_dto(settings) -> StoreSettingsPublicDTO:
    return StoreSettingsPublicDTO(
        store_name=settings.store_name,
        whatsapp_number=settings.whatsapp_number,
        address=settings.address,
        business_hours=settings.business_hours,
        social_links=settings.social_links,
    )
