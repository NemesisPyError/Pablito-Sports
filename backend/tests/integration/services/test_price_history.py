"""Historial de precios (RN-70, 04_BASE_DATOS.md §15.3).

Sin petición HTTP: lo único capaz de confirmar o revertir es `@transactional`,
así que estos tests aíslan la frontera transaccional del servicio.

Alcance: `list_price`. `price_history` (§9.2.15) tiene un único par
`old_price`/`new_price`, ambos `NOT NULL` y sin discriminador de campo, mientras
`products.sale_price` es nullable; los cambios de oferta quedan en `audit_logs`.
"""

import pytest
from sqlalchemy import text

from app.extensions import db
from app.services.admin_product_service import AdminProductService

SKU = "PH-SKU-001"


def _history(engine, product_id: int) -> list:
    with engine.connect() as connection:
        return list(
            connection.execute(
                text(
                    "SELECT old_price, new_price, administrator_id FROM price_history "
                    "WHERE product_id = :product_id ORDER BY id"
                ),
                {"product_id": product_id},
            ).mappings()
        )


def _list_price(engine, product_id: int) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT list_price FROM products WHERE id = :id"), {"id": product_id}
        ).scalar_one()


@pytest.fixture
def product_cleanup(schema_app):
    def limpiar():
        # v1.2.0: el slug lo deriva el backend de `name` y ya no es un valor
        # fijo que la prueba controle, así que el producto se identifica por
        # `sku`, no por `slug` (mismo criterio que en `test_admin_trails.py`
        # y `test_admin_products.py`).
        db.session.execute(
            text(
                "DELETE FROM price_history WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'PH-SKU%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'PH-SKU%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM product_genders WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'PH-SKU%')"
            )
        )
        db.session.execute(text("DELETE FROM products WHERE sku LIKE 'PH-SKU%'"))
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'ph-%'"))
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'ph-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        yield
        limpiar()


@pytest.fixture
def producto(schema_app, administrator_id, product_cleanup):
    """Producto de partida con `list_price` 100000 y sin oferta.

    Crea sus propias clasificaciones: la base de tests solo trae las semillas de
    la migración (sexos y tipos de talle), no catálogo comercial.
    """
    with schema_app.app_context():
        db.session.execute(
            text("INSERT INTO brands (name, slug, is_active) VALUES ('PH Marca', 'ph-marca', true)")
        )
        db.session.execute(
            text(
                "INSERT INTO categories (name, slug, is_active) "
                "VALUES ('PH Categoria', 'ph-categoria', true)"
            )
        )
        db.session.commit()

        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = 'ph-marca') AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = 'ph-categoria') AS category_id, "
                    "(SELECT id FROM genders LIMIT 1) AS gender_id, "
                    "(SELECT id FROM size_types LIMIT 1) AS size_type_id"
                )
            )
            .mappings()
            .one()
        )

        dto = AdminProductService.create(
            {
                "name": "Producto historial",
                "sku": SKU,
                "list_price": 100000,
                "primary_category_id": referencias["category_id"],
                "brand_id": referencias["brand_id"],
                "gender_ids": [referencias["gender_id"]],
                "size_type_id": referencias["size_type_id"],
            },
            administrator_id=administrator_id,
        )
        return {"id": dto["id"], "referencias": dict(referencias)}


def _payload(producto, **overrides) -> dict:
    base = {
        "name": "Producto historial",
        "sku": SKU,
        "list_price": 100000,
        "primary_category_id": producto["referencias"]["category_id"],
        "brand_id": producto["referencias"]["brand_id"],
        "gender_ids": [producto["referencias"]["gender_id"]],
        "size_type_id": producto["referencias"]["size_type_id"],
    }
    base.update(overrides)
    return base


def test_alta_de_producto_no_genera_historial(schema_app, producto, outside):
    """RN-70 registra *modificaciones* de precio: un alta no modifica nada."""
    assert _history(outside, producto["id"]) == []


def test_cambio_de_list_price_registra_una_fila(schema_app, producto, administrator_id, outside):
    with schema_app.app_context():
        AdminProductService.update(
            producto["id"], _payload(producto, list_price=120000), administrator_id=administrator_id
        )

    filas = _history(outside, producto["id"])
    assert len(filas) == 1
    assert filas[0]["old_price"] == 100000
    assert filas[0]["new_price"] == 120000
    assert filas[0]["administrator_id"] == administrator_id
    assert _list_price(outside, producto["id"]) == 120000


def test_cambio_solo_de_sale_price_no_registra_historial(
    schema_app, producto, administrator_id, outside
):
    """Alcance acordado: `price_history` cubre `list_price`; la oferta queda en `audit_logs`."""
    with schema_app.app_context():
        AdminProductService.update(
            producto["id"], _payload(producto, sale_price=80000), administrator_id=administrator_id
        )

    assert _history(outside, producto["id"]) == []


def test_cambio_de_ambos_precios_registra_solo_el_de_lista(
    schema_app, producto, administrator_id, outside
):
    with schema_app.app_context():
        AdminProductService.update(
            producto["id"],
            _payload(producto, list_price=150000, sale_price=90000),
            administrator_id=administrator_id,
        )

    filas = _history(outside, producto["id"])
    assert len(filas) == 1
    assert (filas[0]["old_price"], filas[0]["new_price"]) == (100000, 150000)


def test_actualizacion_sin_cambio_de_precio_no_genera_historial(
    schema_app, producto, administrator_id, outside
):
    """§15.3: un historial con filas donde nada cambió no registra ningún cambio."""
    with schema_app.app_context():
        AdminProductService.update(
            producto["id"],
            _payload(producto, name="Producto historial editado"),
            administrator_id=administrator_id,
        )

    assert _history(outside, producto["id"]) == []


def test_cambios_sucesivos_encadenan_el_historial(schema_app, producto, administrator_id, outside):
    with schema_app.app_context():
        for precio in (110000, 130000):
            AdminProductService.update(
                producto["id"],
                _payload(producto, list_price=precio),
                administrator_id=administrator_id,
            )

    filas = _history(outside, producto["id"])
    assert [(f["old_price"], f["new_price"]) for f in filas] == [
        (100000, 110000),
        (110000, 130000),
    ]


def test_excepcion_revierte_precio_historial_y_auditoria(
    schema_app, producto, administrator_id, outside, monkeypatch
):
    """§15.3 regla 2: el insert va en la misma transacción que el UPDATE."""

    def explota(cls, product):
        raise RuntimeError("fallo simulado despues de escribir")

    monkeypatch.setattr(AdminProductService, "_to_admin_detail_dto", classmethod(explota))

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminProductService.update(
                producto["id"],
                _payload(producto, list_price=200000),
                administrator_id=administrator_id,
            )

        # Reproduce el commit ajeno de Flask-Session.
        db.session.commit()

    assert _history(outside, producto["id"]) == []
    assert _list_price(outside, producto["id"]) == 100000


def test_fallo_de_auditoria_revierte_tambien_el_historial(
    schema_app, producto, administrator_id, outside, monkeypatch
):
    """CONS-05 y RN-70 caen juntos: los tres rastros comparten transacción."""
    from app.core.audit import AuditService

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminProductService.update(
                producto["id"],
                _payload(producto, list_price=200000),
                administrator_id=administrator_id,
            )
        db.session.commit()

    assert _history(outside, producto["id"]) == []
    assert _list_price(outside, producto["id"]) == 100000


def test_cambio_de_precio_deja_historial_y_auditoria_coherentes(
    schema_app, producto, administrator_id, outside
):
    """El mismo cambio queda en los dos rastros, atribuido al mismo administrador."""
    with schema_app.app_context():
        AdminProductService.update(
            producto["id"], _payload(producto, list_price=140000), administrator_id=administrator_id
        )

    filas = _history(outside, producto["id"])
    with outside.connect() as connection:
        auditoria = list(
            connection.execute(
                text(
                    "SELECT action, old_values, new_values, administrator_id FROM audit_logs "
                    "WHERE entity_type = 'product' AND entity_id = :id AND action = 'update' "
                    "ORDER BY id"
                ),
                {"id": producto["id"]},
            ).mappings()
        )

    assert len(filas) == 1
    assert len(auditoria) == 1
    assert auditoria[0]["administrator_id"] == filas[0]["administrator_id"]
    assert auditoria[0]["old_values"]["list_price"] == filas[0]["old_price"]
    assert auditoria[0]["new_values"]["list_price"] == filas[0]["new_price"]
