"""Contract tests for POST /api/v1/cart/revalidate (05_API.md §8)."""

import pytest
from sqlalchemy import select

from app.extensions import db
from app.models import Product, Variant

URL = "/api/v1/cart/revalidate"


def _envelope(response):
    payload = response.get_json()
    assert set(payload) == {"success", "data", "errors", "meta"}
    assert payload["meta"]["request_id"]
    return payload


def _variant_id(catalog_client, product_slug):
    with catalog_client.application.app_context():
        return (
            db.session.execute(
                select(Variant.id)
                .join(Product, Product.id == Variant.product_id)
                .where(Product.slug == product_slug, Variant.deleted_at.is_(None))
                .order_by(Variant.id)
            )
            .scalars()
            .first()
        )


def _post(client, items, version=12):
    return client.post(URL, json={"cart_content_version": version, "items": items})


# --------------------------------------------------------------------------
# Envelope and echoed version
# --------------------------------------------------------------------------


def test_response_echoes_the_cart_content_version(catalog_client):
    # AD-22: the client discards the response if the version moved on.
    variant_id = _variant_id(catalog_client, "botin-nike-mercurial")
    payload = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 2}], 77))

    assert payload["meta"]["cart_content_version"] == 77


def test_items_come_back_in_the_order_they_were_sent(catalog_client):
    first = _variant_id(catalog_client, "botin-nike-mercurial")
    second = _variant_id(catalog_client, "zapatilla-puma-run")

    payload = _envelope(
        _post(
            catalog_client,
            [{"variant_id": second, "quantity": 1}, {"variant_id": first, "quantity": 1}],
        )
    )

    assert [item["variant_id"] for item in payload["data"]["items"]] == [second, first]


def test_item_shape_matches_the_contract(catalog_client):
    variant_id = _variant_id(catalog_client, "botin-nike-mercurial")
    payload = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 2}]))

    assert set(payload["data"]["items"][0]) == {
        "variant_id",
        "status",
        "product",
        "list_price",
        "sale_price",
        "discount_percentage",
        "availability",
        "quantity",
    }
    assert set(payload["data"]["items"][0]["product"]) == {"slug", "name", "thumbnail_url"}


# --------------------------------------------------------------------------
# States (§8.4)
# --------------------------------------------------------------------------


def test_visible_product_returns_ok_with_the_current_price(catalog_client):
    variant_id = _variant_id(catalog_client, "botin-nike-mercurial")
    item = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 2}]))["data"][
        "items"
    ][0]

    assert item["status"] == "ok"
    assert (item["list_price"], item["sale_price"], item["discount_percentage"]) == (
        650000,
        585000,
        10,
    )
    assert item["quantity"] == 2


def test_active_promotion_is_reflected_in_the_revalidated_price(catalog_client):
    # RN-36, RN-37: the price the client will quote comes from the server.
    variant_id = _variant_id(catalog_client, "zapatilla-puma-run")
    item = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 1}]))["data"][
        "items"
    ][0]

    assert (item["list_price"], item["sale_price"]) == (450000, 360000)


def test_out_of_stock_product_stays_in_the_cart(catalog_client):
    # RN-40, AD-25: sin stock se puede seguir consultando.
    variant_id = _variant_id(catalog_client, "zapatilla-puma-run")
    item = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 1}]))["data"][
        "items"
    ][0]

    assert item["status"] == "ok"
    assert item["availability"] == "out_of_stock"


def test_hidden_product_is_reported_and_carries_no_data(catalog_client):
    variant_id = _variant_id(catalog_client, "producto-oculto")
    item = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 1}]))["data"][
        "items"
    ][0]

    assert item["status"] == "product_hidden"
    assert item["product"] is None
    assert item["list_price"] is None
    assert item["quantity"] is None


def test_unknown_variant_is_reported_as_removed(catalog_client):
    item = _envelope(_post(catalog_client, [{"variant_id": 999999, "quantity": 1}]))["data"][
        "items"
    ][0]

    assert item["status"] == "variant_removed"
    assert item["product"] is None


def test_soft_deleted_variant_is_reported_as_removed(catalog_client):
    # AD-15: the variant is logically removed when a colour or size is dropped.
    from datetime import UTC, datetime

    variant_id = _variant_id(catalog_client, "remera-adidas-training")
    with catalog_client.application.app_context():
        variant = db.session.get(Variant, variant_id)
        variant.deleted_at = datetime.now(UTC)
        db.session.commit()
    try:
        item = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 1}]))[
            "data"
        ]["items"][0]

        assert item["status"] == "variant_removed"
    finally:
        with catalog_client.application.app_context():
            variant = db.session.get(Variant, variant_id)
            variant.deleted_at = None
            db.session.commit()


def test_soft_deleted_product_is_reported_as_deleted(catalog_client):
    from datetime import UTC, datetime

    variant_id = _variant_id(catalog_client, "zapatilla-nike-air")
    with catalog_client.application.app_context():
        product = db.session.execute(
            select(Product).where(Product.slug == "zapatilla-nike-air")
        ).scalar_one()
        product.deleted_at = datetime.now(UTC)
        db.session.commit()
    try:
        item = _envelope(_post(catalog_client, [{"variant_id": variant_id, "quantity": 1}]))[
            "data"
        ]["items"][0]

        assert item["status"] == "product_deleted"
    finally:
        with catalog_client.application.app_context():
            product = db.session.execute(
                select(Product).where(Product.slug == "zapatilla-nike-air")
            ).scalar_one()
            product.deleted_at = None
            db.session.commit()


def test_never_returns_409_for_business_conditions(catalog_client):
    # §8.6: a removed variant is an expected outcome, not a conflict.
    hidden = _variant_id(catalog_client, "producto-oculto")
    response = _post(catalog_client, [{"variant_id": hidden, "quantity": 1}])

    assert response.status_code == 200


# --------------------------------------------------------------------------
# Limits and errors (§8.6)
# --------------------------------------------------------------------------


def test_more_than_26_items_returns_422(catalog_client):
    # RN-75, DN-17
    items = [{"variant_id": index, "quantity": 1} for index in range(1, 28)]
    response = _post(catalog_client, items)
    payload = _envelope(response)

    assert response.status_code == 422
    assert payload["errors"][0]["field"] == "items"
    assert payload["errors"][0]["detail"] == "items must contain at most 26 elements"


def test_exactly_26_items_is_accepted(catalog_client):
    items = [{"variant_id": index, "quantity": 1} for index in range(1, 27)]

    assert _post(catalog_client, items).status_code == 200


def test_duplicate_variant_id_returns_422(catalog_client):
    response = _post(
        catalog_client, [{"variant_id": 1, "quantity": 1}, {"variant_id": 1, "quantity": 2}]
    )

    assert response.status_code == 422
    assert "duplicate variant_id" in _envelope(response)["errors"][0]["detail"]


def test_malformed_json_returns_400(catalog_client):
    response = catalog_client.post(URL, data="{not json", content_type="application/json")

    assert response.status_code == 400
    assert _envelope(response)["errors"][0]["code"] == "malformed_request"


@pytest.mark.parametrize("quantity", [0, -1, 100])
def test_quantity_out_of_range_returns_422(catalog_client, quantity):
    # RN-54: entre 1 y 99.
    response = _post(catalog_client, [{"variant_id": 1, "quantity": quantity}])

    assert response.status_code == 422


def test_missing_cart_content_version_returns_422(catalog_client):
    response = catalog_client.post(URL, json={"items": []})

    assert response.status_code == 422
    assert _envelope(response)["errors"][0]["field"] == "cart_content_version"


def test_prices_sent_by_the_client_are_ignored(catalog_client):
    # AD-36: the server never reads economic data from the client.
    variant_id = _variant_id(catalog_client, "botin-nike-mercurial")
    response = catalog_client.post(
        URL,
        json={
            "cart_content_version": 1,
            "items": [{"variant_id": variant_id, "quantity": 1, "sale_price": 1}],
        },
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["items"][0]["sale_price"] == 585000
