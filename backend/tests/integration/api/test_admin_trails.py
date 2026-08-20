"""Lectura de auditoría e historial de precios (05_API.md §9.15, §9.16).

Los dos rastros se alimentan de escrituras reales del panel, no de filas
insertadas a mano: si el contrato de lectura y el de escritura se desalinean,
estos tests lo notan.
"""

import pytest
from sqlalchemy import text

from app.extensions import db

SKU = "TRAIL-SKU-001"
# v1.2.0: el slug lo genera el backend a partir de `name` ("Producto rastro"),
# no un valor fijo que la prueba controle — de ahí que la limpieza de abajo
# identifique los productos por `sku`, no por `slug`.
PRODUCT_SLUG = "producto-rastro"


@pytest.fixture
def catalogo(schema_app, administrator_id):
    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE administrator_id = :administrator_id",
            ),
            {"administrator_id": administrator_id},
        )
        db.session.execute(
            text(
                "DELETE FROM price_history WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'TRAIL-SKU%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'TRAIL-SKU%')"
            )
        )
        db.session.execute(text("DELETE FROM products WHERE sku LIKE 'TRAIL-SKU%'"))
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'trail-%'"))
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'trail-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text(
                "INSERT INTO brands (name, slug, is_active) "
                "VALUES ('Trail Marca', 'trail-marca', true)"
            )
        )
        db.session.execute(
            text(
                "INSERT INTO categories (name, slug, is_active) "
                "VALUES ('Trail Categoria', 'trail-categoria', true)"
            )
        )
        db.session.commit()
        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = 'trail-marca') AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = 'trail-categoria') AS category_id, "
                    "(SELECT id FROM genders LIMIT 1) AS gender_id, "
                    "(SELECT id FROM size_types LIMIT 1) AS size_type_id"
                )
            )
            .mappings()
            .one()
        )
        try:
            yield dict(referencias)
        finally:
            limpiar()


def _payload(catalogo, **overrides) -> dict:
    base = {
        "name": "Producto rastro",
        "sku": SKU,
        "list_price": 100000,
        "primary_category_id": catalogo["category_id"],
        "brand_id": catalogo["brand_id"],
        "gender_id": catalogo["gender_id"],
        "size_type_id": catalogo["size_type_id"],
    }
    base.update(overrides)
    return base


@pytest.fixture
def producto_id(admin_client, catalogo):
    return admin_client.post("/api/v1/admin/products", json=_payload(catalogo)).get_json()["data"][
        "id"
    ]


# Auditoría (§9.15)


def test_audit_logs_exige_sesion(schema_app):
    assert schema_app.test_client().get("/api/v1/admin/audit-logs").status_code == 401


def test_audit_logs_devuelve_el_dto_del_contrato(
    admin_client, administrator_id, catalogo, producto_id
):
    """§10.11: campos exactos de `AuditLogDTO`."""
    response = admin_client.get(f"/api/v1/admin/audit-logs?administrator_id={administrator_id}")

    assert response.status_code == 200
    entrada = response.get_json()["data"][0]
    assert set(entrada) == {
        "id",
        "administrator",
        "action",
        "entity_type",
        "entity_id",
        "old_values",
        "new_values",
        "ip_address",
        "created_at",
    }
    assert set(entrada["administrator"]) == {"id", "username"}
    assert entrada["administrator"]["id"] == administrator_id
    assert entrada["action"] == "create"
    assert entrada["entity_type"] == "product"


def test_audit_logs_no_expone_campos_sensibles(
    admin_client, administrator_id, catalogo, producto_id
):
    """§14.3 regla 2: ni contraseñas, ni hashes, ni tokens."""
    response = admin_client.get(f"/api/v1/admin/audit-logs?administrator_id={administrator_id}")

    serializado = response.get_data(as_text=True).lower()
    for prohibido in ("password", "password_hash", "csrf_token", "secret"):
        assert prohibido not in serializado


def test_audit_logs_ordena_del_mas_reciente_al_mas_antiguo(
    admin_client, administrator_id, catalogo, producto_id
):
    admin_client.put(f"/api/v1/admin/products/{producto_id}", json=_payload(catalogo))

    response = admin_client.get(f"/api/v1/admin/audit-logs?administrator_id={administrator_id}")

    assert [e["action"] for e in response.get_json()["data"]] == ["update", "create"]


def test_audit_logs_filtra_por_entidad_y_accion(
    admin_client, administrator_id, catalogo, producto_id
):
    admin_client.delete(f"/api/v1/admin/products/{producto_id}")

    por_entidad = admin_client.get(
        f"/api/v1/admin/audit-logs?entity_type=product&entity_id={producto_id}"
    )
    por_accion = admin_client.get(
        f"/api/v1/admin/audit-logs?administrator_id={administrator_id}&action=delete"
    )

    assert len(por_entidad.get_json()["data"]) == 2
    assert [e["action"] for e in por_accion.get_json()["data"]] == ["delete"]


def test_audit_logs_rechaza_una_accion_fuera_del_conjunto(admin_client, catalogo):
    """§9.15: el conjunto de `action` es cerrado."""
    response = admin_client.get("/api/v1/admin/audit-logs?action=inventada")

    assert response.status_code == 422
    assert response.get_json()["errors"][0]["field"] == "action"


def test_audit_logs_rechaza_una_fecha_mal_formada(admin_client, catalogo):
    response = admin_client.get("/api/v1/admin/audit-logs?from=ayer")

    assert response.status_code == 422
    assert response.get_json()["errors"][0]["field"] == "from"


def test_audit_logs_pagina(admin_client, administrator_id, catalogo, producto_id):
    admin_client.put(f"/api/v1/admin/products/{producto_id}", json=_payload(catalogo))

    response = admin_client.get(
        f"/api/v1/admin/audit-logs?administrator_id={administrator_id}&per_page=1"
    )

    body = response.get_json()
    assert len(body["data"]) == 1
    assert body["meta"]["total"] == 2
    assert body["meta"]["total_pages"] == 2


def test_audit_logs_es_solo_lectura(admin_client):
    """`AD-20`: la tabla es inmutable, así que el recurso no acepta escrituras."""
    for metodo in ("post", "put", "delete"):
        assert getattr(admin_client, metodo)("/api/v1/admin/audit-logs").status_code == 405


# Historial de precios (§9.16)


def test_price_history_exige_sesion(schema_app):
    assert schema_app.test_client().get("/api/v1/admin/price-history").status_code == 401


def test_price_history_devuelve_el_dto_del_contrato(
    admin_client, administrator_id, catalogo, producto_id
):
    """§10.12: campos exactos de `PriceHistoryDTO`."""
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}", json=_payload(catalogo, list_price=130000)
    )

    response = admin_client.get(f"/api/v1/admin/price-history?product_id={producto_id}")

    assert response.status_code == 200
    entrada = response.get_json()["data"][0]
    assert set(entrada) == {
        "id",
        "product",
        "old_price",
        "new_price",
        "administrator",
        "created_at",
    }
    assert set(entrada["product"]) == {"slug", "name"}
    assert entrada["product"]["slug"] == PRODUCT_SLUG
    assert (entrada["old_price"], entrada["new_price"]) == (100000, 130000)
    assert entrada["administrator"]["id"] == administrator_id


def test_price_history_ordena_del_mas_reciente_al_mas_antiguo(admin_client, catalogo, producto_id):
    for precio in (110000, 120000):
        admin_client.put(
            f"/api/v1/admin/products/{producto_id}", json=_payload(catalogo, list_price=precio)
        )

    response = admin_client.get(f"/api/v1/admin/price-history?product_id={producto_id}")

    assert [e["new_price"] for e in response.get_json()["data"]] == [120000, 110000]


def test_price_history_vacio_cuando_el_precio_no_cambia(admin_client, catalogo, producto_id):
    admin_client.put(f"/api/v1/admin/products/{producto_id}", json=_payload(catalogo))

    response = admin_client.get(f"/api/v1/admin/price-history?product_id={producto_id}")

    assert response.get_json()["data"] == []
    assert response.get_json()["meta"]["total"] == 0


def test_price_history_es_solo_lectura(admin_client):
    """`RN-70`: el historial es inmutable; no se edita ni se elimina."""
    for metodo in ("post", "put", "delete"):
        assert getattr(admin_client, metodo)("/api/v1/admin/price-history").status_code == 405
