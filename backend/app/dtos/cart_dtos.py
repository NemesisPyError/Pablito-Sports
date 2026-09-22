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
# El talle existe y se vende, pero no hay tantas unidades como pide el carrito.
# Es un estado del servidor y no del cliente: la cantidad real solo la conoce
# `variants.quantity`, y el navegador no es fuente de verdad de nada de esto.
STATUS_INSUFFICIENT_STOCK = "insufficient_stock"


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
    # Unidades que el cliente sí puede llevar de este talle. Se informa cuando
    # el estado es `insufficient_stock` —ahí el número es lo que permite armar
    # un mensaje útil y recortar la línea— y también en `ok` mientras el stock
    # sea bajo, con el mismo criterio de divulgación que el detalle de producto
    # (`public_available_quantity`). `None` = hay de sobra.
    available_quantity: int | None = None
