"""Contract tests for the public API (05_API.md §7, 11_TESTING.md §7.2).

They assert the wire contract: routes, field names, HTTP codes and the AD-16
envelope. Field names are frozen: a rename here is a contract change.
"""

import pytest
from sqlalchemy import select

from app.extensions import db
from app.models import Product

BASE = "/api/v1"


def _set_home_new_position(slug: str, position: int | None) -> None:
    product = db.session.execute(select(Product).where(Product.slug == slug)).scalar_one()
    product.home_new_position = position
    db.session.commit()

LIST_ENDPOINTS = (
    "/brands",
    "/sports",
    "/sizes",
    "/genders",
    "/size-types",
)


def _envelope(response):
    payload = response.get_json()
    assert set(payload) == {"success", "data", "errors", "meta"}
    assert payload["meta"]["request_id"]
    return payload


# --------------------------------------------------------------------------
# Envelope and pagination
# --------------------------------------------------------------------------


@pytest.mark.parametrize("path", LIST_ENDPOINTS)
def test_list_endpoints_answer_200_with_pagination_meta(catalog_client, path):
    response = catalog_client.get(BASE + path)
    payload = _envelope(response)

    assert response.status_code == 200
    assert payload["success"] is True
    assert payload["errors"] == []
    assert {"page", "per_page", "total", "total_pages"} <= set(payload["meta"])


def test_categories_returns_a_two_level_tree(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/categories"))
    root = payload["data"][0]

    # RN-83 (v2.10.0): raíces e hijas publican sus sexos por slug (`AD-12`).
    assert set(root) == {"slug", "name", "children", "genders"}
    assert all(
        set(child) == {"slug", "name", "genders"}
        for root_ in payload["data"]
        for child in root_["children"]
    )


def test_store_settings_exposes_only_public_fields(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/store/settings"))

    # The templates and the featured counter belong to StoreSettingsAdminDTO.
    assert set(payload["data"]) == {
        "store_name",
        "whatsapp_number",
        "address",
        "business_hours",
        "social_links",
    }


def test_banners_hide_inactive_and_out_of_window_rows(catalog_client):
    # CE-17, CE-18
    payload = _envelope(catalog_client.get(f"{BASE}/banners"))

    assert [banner["title"] for banner in payload["data"]] == ["Nueva temporada"]
    # §10.3 (v1.1.0): el DTO suma `button_label` y `placement`; sigue sin `id`.
    assert set(payload["data"][0]) == {
        "title",
        "subtitle",
        "image_url",
        "link_url",
        "button_label",
        "placement",
        "position",
    }


# --------------------------------------------------------------------------
# Product list
# --------------------------------------------------------------------------


def test_product_list_item_matches_the_contract(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products"))

    assert set(payload["data"][0]) == {
        "slug",
        "name",
        "brand",
        "primary_category",
        "list_price",
        "sale_price",
        "discount_percentage",
        "availability",
        "is_new",
        "is_featured",
        "thumbnail_url",
        "secondary_thumbnail_url",
        "available_sizes",
    }


def test_available_sizes_hide_the_ones_without_stock(catalog_client):
    # §10.4: `botin-nike-mercurial` tiene los talles 40 y 42, pero el 42 quedó
    # en cantidad 0 en la fixture — no debe listarse como comprable.
    payload = _envelope(catalog_client.get(f"{BASE}/products?brand=nike"))
    product = next(i for i in payload["data"] if i["slug"] == "botin-nike-mercurial")

    assert [size["name"] for size in product["available_sizes"]] == ["40"]


def test_available_sizes_is_empty_when_no_variant_has_stock(catalog_client):
    # `zapatilla-puma-run` tiene un talle cargado, pero en cantidad 0: el
    # producto existe y se lista, pero no hay ningún talle que comprar.
    payload = _envelope(catalog_client.get(f"{BASE}/products?brand=puma"))
    product = payload["data"][0]

    assert product["available_sizes"] == []


def test_available_sizes_respects_the_products_size_type(catalog_client):
    # `remera-adidas-training` es indumentaria (talles alfabéticos), no
    # calzado: los dos talles cargados tienen stock y ambos se listan.
    payload = _envelope(catalog_client.get(f"{BASE}/products?q=remera"))
    product = payload["data"][0]

    assert [size["name"] for size in product["available_sizes"]] == ["M", "L"]
    assert {size["size_type"]["slug"] for size in product["available_sizes"]} == {"apparel_alpha"}


def test_home_new_products_is_empty_by_default(catalog_client):
    # §7.2d: nadie está en Novedades hasta que el administrador lo elige.
    payload = _envelope(catalog_client.get(f"{BASE}/products/home-new"))

    assert payload["data"] == []


def test_home_new_products_returns_the_curated_selection_in_order(catalog_client):
    with catalog_client.application.app_context():
        _set_home_new_position("botin-adidas-predator", 0)
        _set_home_new_position("botin-nike-mercurial", 1)
        try:
            payload = _envelope(catalog_client.get(f"{BASE}/products/home-new"))
            assert [item["slug"] for item in payload["data"]] == [
                "botin-adidas-predator",
                "botin-nike-mercurial",
            ]
        finally:
            _set_home_new_position("botin-adidas-predator", None)
            _set_home_new_position("botin-nike-mercurial", None)


def test_home_new_products_excludes_hidden_products(catalog_client):
    with catalog_client.application.app_context():
        _set_home_new_position("producto-oculto", 0)
        try:
            payload = _envelope(catalog_client.get(f"{BASE}/products/home-new"))
            assert "producto-oculto" not in {item["slug"] for item in payload["data"]}
        finally:
            _set_home_new_position("producto-oculto", None)


def test_hidden_products_are_absent_from_the_catalog(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products"))

    assert "producto-oculto" not in {item["slug"] for item in payload["data"]}


def test_facets_only_offer_options_that_still_yield_results(catalog_client):
    # RN-47
    payload = _envelope(catalog_client.get(f"{BASE}/products?brand=nike"))
    facets = payload["meta"]["facets"]

    assert {item["slug"] for item in facets["brand"]} == {"nike"}
    assert all(item["count"] > 0 for group in facets.values() for item in group)
    assert sum(item["count"] for item in facets["brand"]) == payload["meta"]["total"]


def test_parent_category_filter_includes_descendants(catalog_client):
    # AD-29, CE-19
    payload = _envelope(catalog_client.get(f"{BASE}/products?category=calzado"))

    assert "botin-nike-mercurial" in {item["slug"] for item in payload["data"]}


def test_gender_filter_uses_the_many_to_many_relation(catalog_client):
    # RN-09 (v2.9.0): `genders` es M:N (`product_genders`), no una columna
    # propia de `products` — este filtro es lo primero que lo ejercita en un
    # test de contrato público.
    payload = _envelope(catalog_client.get(f"{BASE}/products?gender=women"))

    assert {item["slug"] for item in payload["data"]} == {
        "zapatilla-nike-air",
        "remera-adidas-training",
    }


def test_gender_filter_combines_with_other_filters(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products?gender=men&category=calzado"))

    slugs = {item["slug"] for item in payload["data"]}
    assert "botin-nike-mercurial" in slugs
    assert "remera-adidas-training" not in slugs


def test_pagination_is_coherent_across_pages(catalog_client):
    first = _envelope(catalog_client.get(f"{BASE}/products?per_page=2&page=1"))
    second = _envelope(catalog_client.get(f"{BASE}/products?per_page=2&page=2"))

    assert first["meta"]["total"] == second["meta"]["total"]
    assert first["meta"]["total_pages"] == 3
    assert not {item["slug"] for item in first["data"]} & {item["slug"] for item in second["data"]}


def test_page_beyond_the_last_one_returns_an_empty_list(catalog_client):
    # CE-21
    payload = _envelope(catalog_client.get(f"{BASE}/products?per_page=2&page=999"))

    assert payload["data"] == []
    assert payload["meta"]["total_pages"] == 3


def test_per_page_above_the_maximum_is_capped_silently(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products?per_page=5000"))

    assert payload["meta"]["per_page"] == 100


def test_unknown_parameters_are_ignored(catalog_client):
    # AD-26, CE-20
    response = catalog_client.get(f"{BASE}/products?brand=nike&fbclid=abc123")

    assert response.status_code == 200
    assert len(response.get_json()["data"]) == 2


def test_unrecognised_sort_falls_back_to_the_default(catalog_client):
    default = _envelope(catalog_client.get(f"{BASE}/products"))
    bogus = _envelope(catalog_client.get(f"{BASE}/products?sort=whatever"))

    assert [i["slug"] for i in bogus["data"]] == [i["slug"] for i in default["data"]]


def test_search_ignores_accents(catalog_client):
    # RN-48, AD-21
    payload = _envelope(catalog_client.get(f"{BASE}/products?q=botin"))

    assert {item["slug"] for item in payload["data"]} == {
        "botin-nike-mercurial",
        "botin-adidas-predator",
    }


def test_search_without_results_returns_an_empty_list(catalog_client):
    # CE-22
    payload = _envelope(catalog_client.get(f"{BASE}/products?q=xyz123"))

    assert payload["data"] == []
    assert payload["meta"]["total"] == 0


# --------------------------------------------------------------------------
# Effective price (RN-30 to RN-37)
# --------------------------------------------------------------------------


def test_active_product_sale_publishes_the_effective_price(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products?brand=nike"))
    product = next(i for i in payload["data"] if i["slug"] == "botin-nike-mercurial")

    assert (product["list_price"], product["sale_price"]) == (650000, 585000)
    # RN-35: rounded down.
    assert product["discount_percentage"] == 10


def test_active_brand_promotion_lowers_the_price(catalog_client):
    # RN-36
    payload = _envelope(catalog_client.get(f"{BASE}/products?brand=puma"))
    product = payload["data"][0]

    assert (product["list_price"], product["sale_price"]) == (450000, 360000)
    assert product["discount_percentage"] == 20


def test_expired_promotion_does_not_apply(catalog_client):
    # RN-32
    payload = _envelope(catalog_client.get(f"{BASE}/products?brand=adidas"))

    assert all(item["sale_price"] is None for item in payload["data"])


def test_on_sale_filter_uses_the_effective_price(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products?on_sale=true"))

    assert {item["slug"] for item in payload["data"]} == {
        "botin-nike-mercurial",
        "zapatilla-puma-run",
    }


def test_price_sort_uses_the_effective_price(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products?sort=price_asc"))
    effective = [item["sale_price"] or item["list_price"] for item in payload["data"]]

    assert effective == sorted(effective)


# --------------------------------------------------------------------------
# Product detail
# --------------------------------------------------------------------------


def test_product_detail_matches_the_contract(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products/botin-nike-mercurial"))

    assert set(payload["data"]) == {
        "slug",
        "name",
        "description",
        "brand",
        "primary_category",
        "categories",
        "sports",
        "genders",
        "size_type",
        "sizes",
        "list_price",
        "sale_price",
        "discount_percentage",
        "availability",
        "is_new",
        "is_featured",
        "images",
        "variants",
    }


def test_variant_exposes_its_id_as_the_only_internal_identifier(catalog_client):
    # AD-15 is the single exception to AD-12.
    payload = _envelope(catalog_client.get(f"{BASE}/products/botin-nike-mercurial"))
    variant = payload["data"]["variants"][0]

    assert set(variant) == {"id", "size", "availability", "available_quantity"}
    assert isinstance(variant["id"], int)


def test_plentiful_stock_does_not_publish_the_exact_count(catalog_client):
    """Divulgación acotada: por encima del umbral el inventario real no sale.

    `botin-nike-mercurial` talle 40 tiene 10 unidades. Publicar ese número en
    una API abierta expone al negocio sin darle nada al cliente, que no va a
    chocar con ese techo.
    """
    payload = _envelope(catalog_client.get(f"{BASE}/products/botin-nike-mercurial"))
    talle_40 = next(v for v in payload["data"]["variants"] if v["size"]["slug"] == "40")

    assert talle_40["availability"] == "available"
    assert talle_40["available_quantity"] is None


def test_low_stock_publishes_the_exact_count(catalog_client):
    """Debajo del umbral el número sí sirve: es lo que frena el `+` del carrito.

    `botin-adidas-predator` talle 42 tiene 3 unidades.
    """
    payload = _envelope(catalog_client.get(f"{BASE}/products/botin-adidas-predator"))
    talle_42 = next(v for v in payload["data"]["variants"] if v["size"]["slug"] == "42")

    assert talle_42["availability"] == "low_stock"
    assert talle_42["available_quantity"] == 3


def test_images_are_ordered_by_position(catalog_client):
    payload = _envelope(catalog_client.get(f"{BASE}/products/botin-nike-mercurial"))
    positions = [image["position"] for image in payload["data"]["images"]]

    assert positions == sorted(positions)
    assert payload["data"]["images"][0]["is_primary"] is True


@pytest.mark.parametrize("slug", ["no-existe", "producto-oculto"])
def test_missing_or_hidden_product_returns_404(catalog_client, slug):
    # CE-13, CE-14
    response = catalog_client.get(f"{BASE}/products/{slug}")
    payload = _envelope(response)

    assert response.status_code == 404
    assert payload["errors"][0]["code"] == "resource_not_found"
    assert payload["data"] is None


# --------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("query", "field"),
    [
        ("page=abc", "page"),
        ("page=0", "page"),
        ("per_page=abc", "per_page"),
        ("min_price=barato", "min_price"),
        ("max_price=caro", "max_price"),
        ("on_sale=quizas", "on_sale"),
        ("is_new=maybe", "is_new"),
    ],
)
def test_malformed_parameters_return_422(catalog_client, query, field):
    response = catalog_client.get(f"{BASE}/products?{query}")
    payload = _envelope(response)

    assert response.status_code == 422
    assert payload["errors"][0]["code"] == "validation_error"
    assert payload["errors"][0]["field"] == field
