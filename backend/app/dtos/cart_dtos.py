"""Cart revalidation DTOs (05_API.md §8.3)."""

from dataclasses import dataclass

from .common_dtos import BaseDTO

# 05_API.md §8.4. The server can only decide the states that depend on existence
# and visibility; the comparison states are derived by the client, which is the
# only side that holds the previous snapshot (§8.5, AD-36).
STATUS_OK = "ok"
STATUS_PRODUCT_HIDDEN = "product_hidden"
STATUS_PRODUCT_DELETED = "product_deleted"
STATUS_VARIANT_REMOVED = "variant_removed"


@dataclass(frozen=True)
class CartProductRefDTO(BaseDTO):
    """Minimal product reference carried by each revalidated item."""

    slug: str
    name: str
    thumbnail_url: str | None


@dataclass(frozen=True)
class CartItemStateDTO(BaseDTO):
    """Authoritative state of one cart item after revalidation."""

    variant_id: int
    status: str
    product: CartProductRefDTO | None
    list_price: int | None
    sale_price: int | None
    discount_percentage: int | None
    availability: str | None
    quantity: int | None
