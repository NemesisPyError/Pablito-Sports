"""Model to DTO conversion for products, images and variants.

The effective price is computed by the service (AD-03); the mapper only receives
the resulting numbers and shapes them (10_BACKEND.md §8.8).
"""

from ..core.utils.stock import derive_availability
from ..core.utils.urls import public_file_url
from ..dtos.product_dtos import ImageDTO, ProductDetailDTO, ProductListItemDTO, VariantDTO
from .catalog_mappers import size_to_dto, to_named_entity


def image_to_dto(image) -> ImageDTO:
    return ImageDTO(
        id=image.id,
        image_url=public_file_url(image.file_path),
        is_primary=image.is_primary,
        position=image.position,
        alt_text=image.alt_text,
    )


def variant_to_dto(variant) -> VariantDTO:
    # 05_API.md §10.5 (v1.4.0): cada variante deriva su propio estado de su
    # propia cantidad, ya no refleja al producto padre.
    return VariantDTO(
        id=variant.id,
        size=size_to_dto(variant.size) if variant.size else None,
        availability=derive_availability(variant.quantity),
    )


def product_to_list_item_dto(
    product,
    *,
    sale_price: int | None,
    discount_percentage: int | None,
    thumbnail_path: str | None,
    secondary_thumbnail_path: str | None = None,
) -> ProductListItemDTO:
    return ProductListItemDTO(
        slug=product.slug,
        name=product.name,
        brand=to_named_entity(product.brand),
        primary_category=to_named_entity(product.primary_category),
        list_price=product.list_price,
        sale_price=sale_price,
        discount_percentage=discount_percentage,
        availability=product.availability,
        is_new=product.is_new,
        is_featured=product.is_featured,
        thumbnail_url=public_file_url(thumbnail_path),
        secondary_thumbnail_url=public_file_url(secondary_thumbnail_path),
    )


def product_to_detail_dto(
    product,
    *,
    sale_price: int | None,
    discount_percentage: int | None,
    categories,
    sports,
    sizes,
    images,
    variants,
) -> ProductDetailDTO:
    return ProductDetailDTO(
        slug=product.slug,
        name=product.name,
        description=product.description,
        brand=to_named_entity(product.brand),
        primary_category=to_named_entity(product.primary_category),
        categories=[to_named_entity(category) for category in categories],
        sports=[to_named_entity(sport) for sport in sports],
        gender=to_named_entity(product.gender),
        size_type=to_named_entity(product.size_type),
        sizes=[size_to_dto(size) for size in sizes],
        list_price=product.list_price,
        sale_price=sale_price,
        discount_percentage=discount_percentage,
        availability=product.availability,
        is_new=product.is_new,
        is_featured=product.is_featured,
        images=[image_to_dto(image) for image in images],
        variants=[variant_to_dto(variant) for variant in variants],
    )
