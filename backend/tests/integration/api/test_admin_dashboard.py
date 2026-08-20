"""Dashboard del panel (05_API.md §9.2, §10.8; `RF-38`, `RF-39`).

Los totales se comparan **contra el estado que el propio test crea**, no contra
números absolutos: la base de tests la comparten otras baterías y un conteo fijo
dependería del orden de ejecución (11_TESTING.md §9.1).
"""

from datetime import UTC, datetime

import pytest
from sqlalchemy import text

from app.extensions import db

PREFIJO = "dash-test"

# Ventanas inequívocas: no dependen de cuándo se ejecute el test.
PASADO_INICIO = datetime(2020, 1, 1, tzinfo=UTC)
PASADO_FIN = datetime(2020, 12, 31, tzinfo=UTC)


@pytest.fixture
def catalogo(schema_app):
    """Marca y categoría propias sobre las que colgar los productos del test."""

    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type = 'product' AND entity_id IN "
                "(SELECT id FROM products WHERE slug LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        for tabla in ("price_history", "variants", "images", "product_categories"):
            db.session.execute(
                text(
                    f"DELETE FROM {tabla} WHERE product_id IN "
                    "(SELECT id FROM products WHERE slug LIKE :p)"
                ),
                {"p": f"{PREFIJO}%"},
            )
        db.session.execute(text("DELETE FROM promotions WHERE name LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(text("DELETE FROM products WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text("INSERT INTO brands (name, slug, is_active) VALUES ('Dash', :s, true)"),
            {"s": f"{PREFIJO}-marca"},
        )
        db.session.execute(
            text("INSERT INTO categories (name, slug, is_active) VALUES ('Dash', :s, true)"),
            {"s": f"{PREFIJO}-cat"},
        )
        db.session.commit()
        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = :m) AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = :c) AS category_id, "
                    "(SELECT id FROM genders LIMIT 1) AS gender_id, "
                    "(SELECT id FROM size_types LIMIT 1) AS size_type_id"
                ),
                {"m": f"{PREFIJO}-marca", "c": f"{PREFIJO}-cat"},
            )
            .mappings()
            .one()
        )
        try:
            yield dict(referencias)
        finally:
            limpiar()


def _crear_producto(catalogo, sufijo: str, **overrides) -> int:
    """Inserta un producto directamente; el dashboard solo lee."""
    campos = {
        "name": f"Dash {sufijo}",
        "slug": f"{PREFIJO}-{sufijo}",
        "sku": f"DASH-{sufijo.upper()}",
        "list_price": 100000,
        "sale_price": None,
        "sale_starts_at": None,
        "sale_ends_at": None,
        "availability": "available",
        "is_active": True,
        "deleted_at": None,
    }
    campos.update(overrides)

    db.session.execute(
        text(
            "INSERT INTO products (name, slug, sku, list_price, sale_price, sale_starts_at, "
            "sale_ends_at, availability, is_active, is_featured, is_new, deleted_at, "
            "primary_category_id, brand_id, gender_id, size_type_id) "
            "VALUES (:name, :slug, :sku, :list_price, :sale_price, :sale_starts_at, "
            ":sale_ends_at, :availability, :is_active, false, false, :deleted_at, "
            ":cat, :marca, :gen, :st)"
        ),
        campos
        | {
            "cat": catalogo["category_id"],
            "marca": catalogo["brand_id"],
            "gen": catalogo["gender_id"],
            "st": catalogo["size_type_id"],
        },
    )
    db.session.commit()
    return db.session.execute(
        text("SELECT id FROM products WHERE slug = :s"), {"s": campos["slug"]}
    ).scalar_one()


def _totales(cliente) -> dict:
    return cliente.get("/api/v1/admin/dashboard").get_json()["data"]["totals"]


# Permisos y contrato


def test_sin_sesion_responde_401(schema_app, catalogo):
    """PA-06."""
    assert schema_app.test_client().get("/api/v1/admin/dashboard").status_code == 401


def test_el_administrador_normal_puede_verlo(schema_app, catalogo):
    """07 §8.1: "Dashboard · Ver" tiene ✅ para ambos roles."""
    from app.core.security.password import hash_password
    from app.models import Administrator

    with schema_app.app_context():
        administrador = Administrator(
            username=f"{PREFIJO}-admin",
            email=f"{PREFIJO}-admin@pablitosports.test",
            password_hash=hash_password("dashboard-password"),
            role="administrator",
            is_active=True,
        )
        db.session.add(administrador)
        db.session.commit()
        identificador = administrador.id

    client = schema_app.test_client()
    with client.session_transaction() as sesion:
        sesion["admin_id"] = identificador
        sesion["logged_in_at"] = datetime.now(UTC).isoformat()
        sesion["last_seen_at"] = datetime.now(UTC).isoformat()

    try:
        assert client.get("/api/v1/admin/dashboard").status_code == 200
    finally:
        with schema_app.app_context():
            db.session.execute(
                text("DELETE FROM administrators WHERE id = :i"), {"i": identificador}
            )
            db.session.commit()


def test_el_dto_tiene_exactamente_los_campos_de_10_8(admin_client, catalogo):
    """§10.8: ni un campo de más ni de menos."""
    respuesta = admin_client.get("/api/v1/admin/dashboard")

    assert respuesta.status_code == 200
    datos = respuesta.get_json()["data"]
    assert set(datos) == {"totals", "incomplete_products", "recent_price_changes"}
    assert set(datos["totals"]) == {
        "total",
        "active",
        "hidden",
        "available",
        "low_stock",
        "out_of_stock",
        "on_sale",
    }


def test_la_envoltura_ad16_se_respeta(admin_client, catalogo):
    cuerpo = admin_client.get("/api/v1/admin/dashboard").get_json()

    assert cuerpo["success"] is True
    assert cuerpo["errors"] == []
    assert "request_id" in cuerpo["meta"]


def test_el_recurso_no_tiene_404(admin_client, catalogo):
    """Es un agregado que siempre existe, aunque el catálogo esté vacío."""
    assert admin_client.get("/api/v1/admin/dashboard").status_code == 200
    assert admin_client.get("/api/v1/admin/dashboard/1").status_code == 404


# Totales (`RF-38`)


def test_los_totales_cuentan_activos_y_ocultos(schema_app, admin_client, catalogo):
    antes = _totales(admin_client)

    with schema_app.app_context():
        _crear_producto(catalogo, "activo-1", is_active=True)
        _crear_producto(catalogo, "activo-2", is_active=True)
        _crear_producto(catalogo, "oculto", is_active=False)

    despues = _totales(admin_client)

    assert despues["total"] == antes["total"] + 3
    assert despues["active"] == antes["active"] + 2
    assert despues["hidden"] == antes["hidden"] + 1


def test_los_totales_excluyen_los_eliminados(schema_app, admin_client, catalogo):
    """`AD-18`: el borrado lógico saca al producto de los totales."""
    with schema_app.app_context():
        _crear_producto(catalogo, "vivo")
    antes = _totales(admin_client)

    with schema_app.app_context():
        _crear_producto(
            catalogo, "eliminado", is_active=False, deleted_at=datetime(2026, 1, 1, tzinfo=UTC)
        )

    despues = _totales(admin_client)

    assert despues["total"] == antes["total"]
    assert despues["hidden"] == antes["hidden"]


def test_los_totales_desglosan_por_disponibilidad(schema_app, admin_client, catalogo):
    """`RN-38b`: los tres estados (v1.4.0, se retira `coming_soon`)."""
    antes = _totales(admin_client)

    with schema_app.app_context():
        _crear_producto(catalogo, "disp", availability="available")
        _crear_producto(catalogo, "poco", availability="low_stock")
        _crear_producto(catalogo, "sin", availability="out_of_stock")

    despues = _totales(admin_client)

    for estado in ("available", "low_stock", "out_of_stock"):
        assert despues[estado] == antes[estado] + 1, estado


def test_la_suma_por_disponibilidad_cuadra_con_el_total(schema_app, admin_client, catalogo):
    with schema_app.app_context():
        _crear_producto(catalogo, "a", availability="available")
        _crear_producto(catalogo, "b", availability="low_stock")

    totales = _totales(admin_client)
    suma = sum(totales[e] for e in ("available", "low_stock", "out_of_stock"))

    assert suma == totales["total"]
    assert totales["active"] + totales["hidden"] == totales["total"]


def test_on_sale_cuenta_la_oferta_vigente_del_producto(schema_app, admin_client, catalogo):
    """`RN-30` a `RN-33`: la oferta cargada cuenta mientras esté vigente."""
    antes = _totales(admin_client)

    with schema_app.app_context():
        _crear_producto(
            catalogo,
            "en-oferta",
            sale_price=80000,
            sale_starts_at=datetime(2020, 1, 1, tzinfo=UTC),
            sale_ends_at=None,
        )

    assert _totales(admin_client)["on_sale"] == antes["on_sale"] + 1


def test_on_sale_ignora_la_oferta_vencida(schema_app, admin_client, catalogo):
    """`RN-32`: fuera de su rango la oferta no aplica, aunque el precio esté cargado."""
    antes = _totales(admin_client)

    with schema_app.app_context():
        _crear_producto(
            catalogo,
            "oferta-vencida",
            sale_price=80000,
            sale_starts_at=PASADO_INICIO,
            sale_ends_at=PASADO_FIN,
        )

    assert _totales(admin_client)["on_sale"] == antes["on_sale"]


def test_on_sale_cuenta_la_promocion_vigente(schema_app, admin_client, catalogo):
    """`RN-36`: una promoción sobre la marca alcanza a sus productos."""
    antes = _totales(admin_client)

    with schema_app.app_context():
        _crear_producto(catalogo, "con-promo")
        db.session.execute(
            text(
                "INSERT INTO promotions (name, discount_percentage, starts_at, ends_at, "
                "is_active, brand_id) VALUES (:n, 20, :desde, NULL, true, :marca)"
            ),
            {
                "n": f"{PREFIJO}-promo",
                "desde": datetime(2020, 1, 1, tzinfo=UTC),
                "marca": catalogo["brand_id"],
            },
        )
        db.session.commit()

    assert _totales(admin_client)["on_sale"] == antes["on_sale"] + 1


# Productos incompletos (`RF-39`)


def test_señala_el_producto_sin_imagen(schema_app, admin_client, catalogo):
    with schema_app.app_context():
        identificador = _crear_producto(catalogo, "sin-imagen")

    incompletos = admin_client.get("/api/v1/admin/dashboard").get_json()["data"][
        "incomplete_products"
    ]
    propio = next(p for p in incompletos if p["id"] == identificador)

    assert "image" in propio["missing"]
    assert set(propio) == {"id", "slug", "name", "missing"}


def test_señala_el_producto_sin_categoria_secundaria(schema_app, admin_client, catalogo):
    """§10.8 nombra `product_categories` entre las fuentes del DTO.

    `primary_category_id` es `NOT NULL` (04 §9.2.1), así que la única carencia
    de categoría que puede existir es la de la tabla de asociación.
    """
    with schema_app.app_context():
        identificador = _crear_producto(catalogo, "sin-categoria")

    incompletos = admin_client.get("/api/v1/admin/dashboard").get_json()["data"][
        "incomplete_products"
    ]
    propio = next(p for p in incompletos if p["id"] == identificador)

    assert "category" in propio["missing"]


def test_un_producto_completo_no_aparece(schema_app, admin_client, catalogo):
    with schema_app.app_context():
        identificador = _crear_producto(catalogo, "completo")
        db.session.execute(
            text(
                "INSERT INTO images (product_id, file_path, is_primary, position) "
                "VALUES (:p, 'dash/x-800.webp', true, 0)"
            ),
            {"p": identificador},
        )
        db.session.execute(
            text("INSERT INTO product_categories (product_id, category_id) VALUES (:p, :c)"),
            {"p": identificador, "c": catalogo["category_id"]},
        )
        db.session.commit()

    incompletos = admin_client.get("/api/v1/admin/dashboard").get_json()["data"][
        "incomplete_products"
    ]

    assert identificador not in {p["id"] for p in incompletos}


def test_los_eliminados_no_figuran_como_incompletos(schema_app, admin_client, catalogo):
    with schema_app.app_context():
        identificador = _crear_producto(
            catalogo, "borrado", deleted_at=datetime(2026, 1, 1, tzinfo=UTC)
        )

    incompletos = admin_client.get("/api/v1/admin/dashboard").get_json()["data"][
        "incomplete_products"
    ]

    assert identificador not in {p["id"] for p in incompletos}


def test_la_lista_de_incompletos_esta_acotada(schema_app, admin_client, catalogo):
    from app.services.admin_dashboard_service import MAX_INCOMPLETE_PRODUCTS

    incompletos = admin_client.get("/api/v1/admin/dashboard").get_json()["data"][
        "incomplete_products"
    ]

    assert len(incompletos) <= MAX_INCOMPLETE_PRODUCTS


# Cambios de precio recientes


def test_los_cambios_de_precio_usan_el_dto_del_contrato(schema_app, admin_client, catalogo):
    """§10.12 `PriceHistoryDTO`, reutilizado sin duplicar."""
    from app.services.admin_product_service import AdminProductService

    with schema_app.app_context():
        identificador = _crear_producto(catalogo, "con-historial")
        administrador = db.session.execute(
            text("SELECT id FROM administrators ORDER BY id LIMIT 1")
        ).scalar_one()
        AdminProductService.update(
            identificador,
            {
                "name": "Dash con-historial",
                "slug": f"{PREFIJO}-con-historial",
                "sku": "DASH-CON-HISTORIAL",
                "list_price": 155000,
                "primary_category_id": catalogo["category_id"],
                "brand_id": catalogo["brand_id"],
                "gender_id": catalogo["gender_id"],
                "size_type_id": catalogo["size_type_id"],
            },
            administrator_id=administrador,
        )

    cambios = admin_client.get("/api/v1/admin/dashboard").get_json()["data"]["recent_price_changes"]

    assert cambios
    assert set(cambios[0]) == {
        "id",
        "product",
        "old_price",
        "new_price",
        "administrator",
        "created_at",
    }


def test_los_cambios_de_precio_estan_acotados_y_ordenados(admin_client, catalogo):
    from app.services.admin_dashboard_service import MAX_RECENT_PRICE_CHANGES

    cambios = admin_client.get("/api/v1/admin/dashboard").get_json()["data"]["recent_price_changes"]

    assert len(cambios) <= MAX_RECENT_PRICE_CHANGES
    fechas = [c["created_at"] for c in cambios]
    assert fechas == sorted(fechas, reverse=True)


# Seguridad


def test_no_filtra_campos_sensibles(admin_client, catalogo):
    """El dashboard agrega; no debe arrastrar nada interno."""
    cuerpo = admin_client.get("/api/v1/admin/dashboard").get_data(as_text=True).lower()

    for prohibido in ("password", "password_hash", "csrf", "secret", "file_path", "email"):
        assert prohibido not in cuerpo
