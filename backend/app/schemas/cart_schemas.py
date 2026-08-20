"""Cart revalidation input (05_API.md §8.2, §8.6).

AD-36: the client sends identities and quantities, never prices. Any price field
that arrived would simply be ignored — the server never reads economic data from
the client.
"""

from dataclasses import dataclass

from ..core.exceptions import BadRequestError, RequestValidationError

# RN-75, DN-17
MAX_CART_ITEMS = 26

# RN-54
MIN_QUANTITY = 1
MAX_QUANTITY = 99


@dataclass(frozen=True)
class CartItemInput:
    variant_id: int
    quantity: int


@dataclass(frozen=True)
class CartRevalidationInput:
    cart_content_version: int
    items: list[CartItemInput]


def _integer(value, field: str, *, minimum: int | None = None, maximum: int | None = None) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise RequestValidationError([{"field": field, "detail": f"{field} must be an integer"}])
    if minimum is not None and value < minimum:
        raise RequestValidationError(
            [{"field": field, "detail": f"{field} must be greater than or equal to {minimum}"}]
        )
    if maximum is not None and value > maximum:
        raise RequestValidationError(
            [{"field": field, "detail": f"{field} must be less than or equal to {maximum}"}]
        )
    return value


def parse_revalidation_input(payload) -> CartRevalidationInput:
    """Validates the request body. A malformed body is a 400; bad content a 422."""
    if not isinstance(payload, dict):
        raise BadRequestError("request body must be a JSON object")

    version = _integer(payload.get("cart_content_version"), "cart_content_version", minimum=0)

    raw_items = payload.get("items")
    if not isinstance(raw_items, list):
        raise RequestValidationError([{"field": "items", "detail": "items must be an array"}])
    if len(raw_items) > MAX_CART_ITEMS:
        raise RequestValidationError(
            [
                {
                    "field": "items",
                    "detail": f"items must contain at most {MAX_CART_ITEMS} elements",
                }
            ]
        )

    items: list[CartItemInput] = []
    seen: set[int] = set()
    for index, raw in enumerate(raw_items):
        if not isinstance(raw, dict):
            raise RequestValidationError(
                [{"field": f"items[{index}]", "detail": "item must be an object"}]
            )
        variant_id = _integer(raw.get("variant_id"), f"items[{index}].variant_id", minimum=1)
        quantity = _integer(
            raw.get("quantity"),
            f"items[{index}].quantity",
            minimum=MIN_QUANTITY,
            maximum=MAX_QUANTITY,
        )
        if variant_id in seen:
            raise RequestValidationError(
                [{"field": "items", "detail": f"duplicate variant_id {variant_id}"}]
            )
        seen.add(variant_id)
        items.append(CartItemInput(variant_id=variant_id, quantity=quantity))

    return CartRevalidationInput(cart_content_version=version, items=items)
