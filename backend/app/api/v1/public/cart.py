"""Cart revalidation endpoint (05_API.md §8)."""

from flask import Blueprint, request

from ....core.exceptions import BadRequestError
from ....core.utils.responses import success_response
from ....schemas.cart_schemas import parse_revalidation_input
from ....services.cart_service import CartService

cart_bp = Blueprint("cart", __name__)


@cart_bp.post("/cart/revalidate")
def revalidate_cart():
    """§8.1: the only public POST that creates nothing (AD-32).

    Never returns 409: a removed variant or a hidden product is an expected
    outcome reported in `data.items[].status` (§8.6).
    """
    try:
        body = request.get_json(silent=False)
    except Exception:  # noqa: BLE001 - werkzeug raises its own type for bad JSON
        raise BadRequestError("request body is not valid JSON") from None

    payload = parse_revalidation_input(body)
    items = CartService.revalidate(payload)

    return success_response(
        {"items": [item.to_dict() for item in items]},
        # AD-22: the client discards the response if the version moved on.
        meta={"cart_content_version": payload.cart_content_version},
    )
