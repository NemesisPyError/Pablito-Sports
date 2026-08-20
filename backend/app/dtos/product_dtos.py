"""Product DTOs (05_API.md §10.4, §10.5, §10.6)."""

from dataclasses import dataclass, field

from .catalog_dtos import SizeDTO
from .common_dtos import BaseDTO, NamedEntityDTO


@dataclass(frozen=True)
class ImageDTO(BaseDTO):
    id: int
    image_url: str
    is_primary: bool
    position: int
    alt_text: str | None


@dataclass(frozen=True)
class VariantDTO(BaseDTO):
    """AD-15: variant_id is the only internal identifier the public API exposes."""

    id: int
    size: SizeDTO | None
    availability: str


@dataclass(frozen=True)
class ProductListItemDTO(BaseDTO):
    slug: str
    name: str
    brand: NamedEntityDTO
    primary_category: NamedEntityDTO
    list_price: int
    sale_price: int | None
    discount_percentage: int | None
    availability: str
    is_new: bool
    is_featured: bool
    thumbnail_url: str | None
    secondary_thumbnail_url: str | None


@dataclass(frozen=True)
class ProductDetailDTO(BaseDTO):
    slug: str
    name: str
    description: str | None
    brand: NamedEntityDTO
    primary_category: NamedEntityDTO
    categories: list[NamedEntityDTO]
    sports: list[NamedEntityDTO]
    gender: NamedEntityDTO
    size_type: NamedEntityDTO
    sizes: list[SizeDTO]
    list_price: int
    sale_price: int | None
    discount_percentage: int | None
    availability: str
    is_new: bool
    is_featured: bool
    images: list[ImageDTO] = field(default_factory=list)
    variants: list[VariantDTO] = field(default_factory=list)
