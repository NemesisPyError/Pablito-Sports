"""Model to DTO conversion for cart revalidation."""

from ..core.utils.urls import public_file_url
from ..dtos.cart_dtos import CartItemStateDTO, CartProductRefDTO


def product_to_cart_ref(product, thumbnail_path: str | None) -> CartProductRefDTO:
    return CartProductRefDTO(
        slug=product.slug,
        name=product.name,
        thumbnail_url=public_file_url(thumbnail_path),
    )


def unavailable_item(variant_id: int, status: str) -> CartItemStateDTO:
    """§8.3: an item the client can no longer buy carries no data at all."""
    return CartItemStateDTO(
        variant_id=variant_id,
        status=status,
        product=None,
        list_price=None,
        sale_price=None,
        discount_percentage=None,
        availability=None,
        quantity=None,
    )


def available_item(
    variant_id: int,
    *,
    status: str,
    product_ref: CartProductRefDTO,
    list_price: int,
    sale_price: int | None,
    discount_percentage: int | None,
    availability: str,
    quantity: int,
) -> CartItemStateDTO:
    return CartItemStateDTO(
        variant_id=variant_id,
        status=status,
        product=product_ref,
        list_price=list_price,
        sale_price=sale_price,
        discount_percentage=discount_percentage,
        availability=availability,
        quantity=quantity,
    )
