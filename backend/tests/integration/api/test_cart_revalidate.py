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
        "available_quantity",
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


# --------------------------------------------------------------------------
# Stock por talle (RN-54b)
#
# El carrito vive en el navegador (AD-06) y este endpoint es el único lugar
# donde el servidor lo ve (AD-32): si la cantidad no se comprueba acá, no se
# comprueba en ninguna parte. Los tests mandan la cantidad a mano, que es
# exactamente lo que haría un carrito manipulado o desactualizado.
#
# Stock de la fixture: `botin-adidas-predator` talle 42 = 3 y talle 44 = 6;
# `botin-nike-mercurial` talle 40 = 10 y talle 42 = 0.
# --------------------------------------------------------------------------


def _variant_por_talle(catalog_client, product_slug, size_slug):
    from app.models import Size

    with catalog_client.application.app_context():
        return db.session.execute(
            select(Variant.id)
            .join(Product, Product.id == Variant.product_id)
            .join(Size, Size.id == Variant.size_id)
            .where(
                Product.slug == product_slug,
                Size.slug == size_slug,
                Variant.deleted_at.is_(None),
            )
        ).scalar_one()


def _item(response, indice=0):
    return response.get_json()["data"]["items"][indice]


def test_una_cantidad_menor_al_stock_se_acepta(catalog_client):
    variante = _variant_por_talle(catalog_client, "botin-adidas-predator", "42")  # stock 3

    assert _item(_post(catalog_client, [{"variant_id": variante, "quantity": 2}]))["status"] == "ok"


def test_la_cantidad_igual_al_stock_se_acepta(catalog_client):
    """El borde exacto: 3 de 3 es una compra válida, no un exceso."""
    variante = _variant_por_talle(catalog_client, "botin-adidas-predator", "42")  # stock 3

    assert _item(_post(catalog_client, [{"variant_id": variante, "quantity": 3}]))["status"] == "ok"


def test_una_cantidad_mayor_al_stock_se_rechaza_y_dice_cuanto_hay(catalog_client):
    variante = _variant_por_talle(catalog_client, "botin-adidas-predator", "42")  # stock 3

    item = _item(_post(catalog_client, [{"variant_id": variante, "quantity": 4}]))

    assert item["status"] == "insufficient_stock"
    # El número es lo que permite al cliente recortar la línea y explicar por qué.
    assert item["available_quantity"] == 3


def test_un_talle_agotado_acepta_una_unidad_para_consultar(catalog_client):
    """RN-40: sin stock la consulta sigue valiendo, y el carrito es de consulta."""
    variante = _variant_por_talle(catalog_client, "botin-nike-mercurial", "42")  # stock 0

    item = _item(_post(catalog_client, [{"variant_id": variante, "quantity": 1}]))

    assert item["status"] == "ok"
    # Se informa que no hay unidades: la consulta se permite, el stock no se miente.
    assert item["available_quantity"] == 0


def test_un_talle_agotado_no_acepta_mas_de_una_unidad(catalog_client):
    """El piso de RN-40 es una unidad, no una excepción sin techo."""
    variante = _variant_por_talle(catalog_client, "botin-nike-mercurial", "42")  # stock 0

    item = _item(_post(catalog_client, [{"variant_id": variante, "quantity": 2}]))

    assert item["status"] == "insufficient_stock"
    assert item["available_quantity"] == 0


def test_dos_talles_del_mismo_producto_se_evaluan_por_separado(catalog_client):
    """El stock es de la variante, no del producto: un talle no habilita al otro."""
    talle_42 = _variant_por_talle(catalog_client, "botin-adidas-predator", "42")  # stock 3
    talle_44 = _variant_por_talle(catalog_client, "botin-adidas-predator", "44")  # stock 6

    respuesta = _post(
        catalog_client,
        [
            {"variant_id": talle_42, "quantity": 4},
            {"variant_id": talle_44, "quantity": 4},
        ],
    )

    assert _item(respuesta, 0)["status"] == "insufficient_stock"
    assert _item(respuesta, 0)["available_quantity"] == 3
    assert _item(respuesta, 1)["status"] == "ok"


def test_el_stock_holgado_no_publica_la_cantidad_exacta(catalog_client):
    """Divulgación acotada: por encima del umbral el número no sale."""
    variante = _variant_por_talle(catalog_client, "botin-nike-mercurial", "40")  # stock 10

    item = _item(_post(catalog_client, [{"variant_id": variante, "quantity": 2}]))

    assert item["status"] == "ok"
    assert item["available_quantity"] is None


def test_el_stock_bajo_si_publica_la_cantidad_exacta(catalog_client):
    """Debajo del umbral el número sirve para frenar el `+` antes de frustrar."""
    variante = _variant_por_talle(catalog_client, "botin-adidas-predator", "42")  # stock 3

    item = _item(_post(catalog_client, [{"variant_id": variante, "quantity": 1}]))

    assert item["status"] == "ok"
    assert item["available_quantity"] == 3


def test_el_exceso_no_altera_el_stock_guardado(catalog_client):
    """Revalidar es de solo lectura: rechazar no puede tocar el inventario."""
    variante = _variant_por_talle(catalog_client, "botin-adidas-predator", "42")

    _post(catalog_client, [{"variant_id": variante, "quantity": 99}])

    with catalog_client.application.app_context():
        assert db.session.get(Variant, variante).quantity == 3
