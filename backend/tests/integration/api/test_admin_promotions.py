"""Promociones del panel (05_API.md §9.10, `RN-30` a `RN-38b`).

Las fechas son **fijas y explícitas**, nunca `now()`: una promoción vigente o
vencida debe serlo por el valor que el test declara, no por el instante en que
se ejecute (11_TESTING.md §9.1).
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text

from app.extensions import db

PREFIJO = "promo-test"

# Reloj de referencia. Todo lo demás se expresa respecto de él.
AHORA = datetime(2026, 6, 15, 12, 0, 0, tzinfo=UTC)
AYER = AHORA - timedelta(days=1)
MANANA = AHORA + timedelta(days=1)
SEMANA_PASADA = AHORA - timedelta(days=7)


def _iso(momento: datetime) -> str:
    return momento.isoformat()


@pytest.fixture
def catalogo(schema_app):
    """Marca, categoría y producto propios sobre los que apuntar promociones."""

    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type = 'promotion' AND entity_id IN "
                "(SELECT id FROM promotions WHERE name LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        db.session.execute(text("DELETE FROM promotions WHERE name LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(
            text(
                "DELETE FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE slug LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        db.session.execute(text("DELETE FROM products WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text("INSERT INTO brands (name, slug, is_active) " "VALUES ('Promo Marca', :s, true)"),
            {"s": f"{PREFIJO}-marca"},
        )
        db.session.execute(
            text(
                "INSERT INTO categories (name, slug, is_active) "
                "VALUES ('Promo Categoria', :s, true)"
            ),
            {"s": f"{PREFIJO}-categoria"},
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
                {"m": f"{PREFIJO}-marca", "c": f"{PREFIJO}-categoria"},
            )
            .mappings()
            .one()
        )
        db.session.execute(
            text(
                "INSERT INTO products (name, slug, sku, list_price, availability, is_active, "
                "is_featured, is_new, primary_category_id, brand_id, gender_id, size_type_id) "
                "VALUES ('Promo Producto', :s, 'PROMO-001', 100000, 'available', true, "
                "false, false, :c, :b, :g, :t)"
            ),
            {
                "s": f"{PREFIJO}-producto",
                "c": referencias["category_id"],
                "b": referencias["brand_id"],
                "g": referencias["gender_id"],
                "t": referencias["size_type_id"],
            },
        )
        db.session.commit()
        product_id = db.session.execute(
            text("SELECT id FROM products WHERE slug = :s"), {"s": f"{PREFIJO}-producto"}
        ).scalar_one()

        datos = dict(referencias) | {"product_id": product_id}
        try:
            yield datos
        finally:
            limpiar()


def _payload(catalogo, sufijo: str = "a", **overrides) -> dict:
    base = {
        "name": f"{PREFIJO}-{sufijo}",
        "description": "Promoción de prueba",
        "discount_percentage": 20,
        "starts_at": _iso(AYER),
        "ends_at": _iso(MANANA),
        "is_active": True,
        "brand_id": catalogo["brand_id"],
    }
    base.update(overrides)
    return base


@pytest.fixture
def cliente(admin_client):
    return admin_client


# Contrato y permisos


def test_todas_las_rutas_exigen_sesion(schema_app, catalogo):
    """PA-06."""
    client = schema_app.test_client()
    for metodo, ruta in [
        ("get", "/api/v1/admin/promotions"),
        ("post", "/api/v1/admin/promotions"),
        ("get", "/api/v1/admin/promotions/1"),
        ("put", "/api/v1/admin/promotions/1"),
        ("delete", "/api/v1/admin/promotions/1"),
    ]:
        assert getattr(client, metodo)(ruta, json={}).status_code == 401, ruta


def test_el_administrador_normal_puede_gestionar_promociones(schema_app, catalogo):
    """07 §8.1: "Promociones · CRUD completo" tiene ✅ para ambos roles."""
    from datetime import UTC as TZ
    from datetime import datetime as dt

    from app.core.security.password import hash_password
    from app.models import Administrator

    with schema_app.app_context():
        administrador = Administrator(
            username=f"{PREFIJO}-admin",
            email=f"{PREFIJO}-admin@pablitosports.test",
            password_hash=hash_password("promo-password-larga"),
            role="administrator",
            is_active=True,
        )
        db.session.add(administrador)
        db.session.commit()
        identificador = administrador.id

    client = schema_app.test_client()
    with client.session_transaction() as sesion:
        sesion["admin_id"] = identificador
        sesion["logged_in_at"] = dt.now(TZ).isoformat()
        sesion["last_seen_at"] = dt.now(TZ).isoformat()

    try:
        assert client.get("/api/v1/admin/promotions").status_code == 200
        assert client.post("/api/v1/admin/promotions", json=_payload(catalogo)).status_code == 201
    finally:
        with schema_app.app_context():
            db.session.execute(
                text(
                    "DELETE FROM audit_logs WHERE administrator_id = :i",
                ),
                {"i": identificador},
            )
            db.session.execute(
                text("DELETE FROM administrators WHERE id = :i"), {"i": identificador}
            )
            db.session.commit()


def test_creacion_devuelve_201_y_el_dto_del_contrato(cliente, catalogo):
    """§10.9: campos exactos de `PromotionDTO`."""
    respuesta = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo))

    assert respuesta.status_code == 201
    datos = respuesta.get_json()["data"]
    assert set(datos) == {
        "id",
        "name",
        "description",
        "discount_percentage",
        "starts_at",
        "ends_at",
        "is_active",
        "scope",
    }
    assert set(datos["scope"]) == {"type", "entity"}
    assert set(datos["scope"]["entity"]) == {"slug", "name"}
    assert datos["scope"]["type"] == "brand"
    assert datos["scope"]["entity"]["slug"] == f"{PREFIJO}-marca"


@pytest.mark.parametrize(
    ("campo", "tipo"),
    [("product_id", "product"), ("category_id", "category"), ("brand_id", "brand")],
)
def test_el_alcance_puede_ser_producto_categoria_o_marca(cliente, catalogo, campo, tipo):
    """`RN-36`."""
    payload = _payload(catalogo, sufijo=tipo)
    payload.pop("brand_id")
    payload[campo] = catalogo[campo]

    respuesta = cliente.post("/api/v1/admin/promotions", json=payload)

    assert respuesta.status_code == 201
    assert respuesta.get_json()["data"]["scope"]["type"] == tipo


# Validaciones (§10.9)


def test_sin_alcance_es_422(cliente, catalogo):
    """`RN-36`: exactamente uno, ni ninguno."""
    payload = _payload(catalogo)
    payload.pop("brand_id")

    respuesta = cliente.post("/api/v1/admin/promotions", json=payload)

    assert respuesta.status_code == 422
    assert "product_id" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_con_dos_alcances_es_422(cliente, catalogo):
    """`RN-36`: exactamente uno, ni varios."""
    respuesta = cliente.post(
        "/api/v1/admin/promotions",
        json=_payload(catalogo, category_id=catalogo["category_id"]),
    )

    assert respuesta.status_code == 422


@pytest.mark.parametrize("descuento", [0, 100, -5, 150])
def test_descuento_fuera_de_rango_es_422(cliente, catalogo, descuento):
    """04 §9.2.11: `CHECK (discount_percentage BETWEEN 1 AND 99)`."""
    respuesta = cliente.post(
        "/api/v1/admin/promotions", json=_payload(catalogo, discount_percentage=descuento)
    )

    assert respuesta.status_code == 422
    assert "discount_percentage" in {e["field"] for e in respuesta.get_json()["errors"]}


@pytest.mark.parametrize("descuento", [1, 50, 99])
def test_descuento_en_los_limites_se_acepta(cliente, catalogo, descuento):
    respuesta = cliente.post(
        "/api/v1/admin/promotions",
        json=_payload(catalogo, sufijo=f"d{descuento}", discount_percentage=descuento),
    )

    assert respuesta.status_code == 201


def test_sin_starts_at_es_422(cliente, catalogo):
    """04 §9.2.11: `starts_at` es NOT NULL."""
    payload = _payload(catalogo)
    payload.pop("starts_at")

    respuesta = cliente.post("/api/v1/admin/promotions", json=payload)

    assert respuesta.status_code == 422
    assert "starts_at" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_ends_at_anterior_a_starts_at_es_422(cliente, catalogo):
    """04 §9.2.11: `CHECK (ends_at IS NULL OR ends_at > starts_at)`."""
    respuesta = cliente.post(
        "/api/v1/admin/promotions",
        json=_payload(catalogo, starts_at=_iso(MANANA), ends_at=_iso(AYER)),
    )

    assert respuesta.status_code == 422
    assert "ends_at" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_ends_at_igual_a_starts_at_es_422(cliente, catalogo):
    """El CHECK exige estrictamente posterior."""
    respuesta = cliente.post(
        "/api/v1/admin/promotions",
        json=_payload(catalogo, starts_at=_iso(AHORA), ends_at=_iso(AHORA)),
    )

    assert respuesta.status_code == 422


def test_sin_ends_at_la_promocion_rige_indefinidamente(cliente, catalogo):
    """`RN-33`."""
    payload = _payload(catalogo, sufijo="sin-fin")
    payload["ends_at"] = None

    respuesta = cliente.post("/api/v1/admin/promotions", json=payload)

    assert respuesta.status_code == 201
    assert respuesta.get_json()["data"]["ends_at"] is None


def test_fecha_mal_formada_es_422(cliente, catalogo):
    respuesta = cliente.post(
        "/api/v1/admin/promotions", json=_payload(catalogo, starts_at="el martes")
    )

    assert respuesta.status_code == 422
    assert "starts_at" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_alcance_inexistente_es_422(cliente, catalogo):
    """Sin esta comprobación la FK produciría un 500."""
    respuesta = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo, brand_id=99999999))

    assert respuesta.status_code == 422
    assert "brand_id" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_nombre_vacio_es_422(cliente, catalogo):
    respuesta = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo, name="   "))

    assert respuesta.status_code == 422


# Solapamiento y concurrencia (`RN-37`)


def test_dos_promociones_vigentes_sobre_la_misma_entidad_son_validas(cliente, catalogo):
    """`RN-37` resuelve la concurrencia en la lectura, no la prohíbe en la carga.

    No existe regla que impida el solapamiento: dos promociones simultáneas
    sobre la misma marca son un estado válido, y el catálogo aplica la de mayor
    descuento.
    """
    primera = cliente.post(
        "/api/v1/admin/promotions",
        json=_payload(catalogo, sufijo="solapada-1", discount_percentage=10),
    )
    segunda = cliente.post(
        "/api/v1/admin/promotions",
        json=_payload(catalogo, sufijo="solapada-2", discount_percentage=30),
    )

    assert primera.status_code == 201
    assert segunda.status_code == 201


# Ciclo de vida


def test_actualizacion_reemplaza_el_recurso_completo(cliente, catalogo):
    creada = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo)).get_json()["data"]

    respuesta = cliente.put(
        f"/api/v1/admin/promotions/{creada['id']}",
        json=_payload(catalogo, name=f"{PREFIJO}-editada", discount_percentage=45),
    )

    assert respuesta.status_code == 200
    datos = respuesta.get_json()["data"]
    assert datos["name"] == f"{PREFIJO}-editada"
    assert datos["discount_percentage"] == 45


def test_cambiar_el_alcance_limpia_el_anterior(cliente, catalogo):
    """El CHECK `scope_exclusive` no admite dos columnas pobladas."""
    creada = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo)).get_json()["data"]
    assert creada["scope"]["type"] == "brand"

    payload = _payload(catalogo)
    payload.pop("brand_id")
    payload["category_id"] = catalogo["category_id"]

    respuesta = cliente.put(f"/api/v1/admin/promotions/{creada['id']}", json=payload)

    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["scope"]["type"] == "category"


def test_desactivar_una_promocion(cliente, catalogo):
    creada = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo)).get_json()["data"]

    respuesta = cliente.put(
        f"/api/v1/admin/promotions/{creada['id']}", json=_payload(catalogo, is_active=False)
    )

    assert respuesta.get_json()["data"]["is_active"] is False


def test_borrado_logico(cliente, catalogo, outside):
    """`AD-18`: la fila permanece, marcada."""
    creada = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo)).get_json()["data"]

    respuesta = cliente.delete(f"/api/v1/admin/promotions/{creada['id']}")

    assert respuesta.status_code == 200
    with outside.connect() as conexion:
        fila = conexion.execute(
            text("SELECT is_active, deleted_at FROM promotions WHERE id = :i"), {"i": creada["id"]}
        ).one()
    assert fila.is_active is False
    assert fila.deleted_at is not None

    assert cliente.get(f"/api/v1/admin/promotions/{creada['id']}").status_code == 404
    listado = cliente.get("/api/v1/admin/promotions").get_json()["data"]
    assert creada["id"] not in {item["id"] for item in listado}


def test_promocion_inexistente_es_404(cliente, catalogo):
    assert cliente.get("/api/v1/admin/promotions/99999999").status_code == 404
    assert cliente.delete("/api/v1/admin/promotions/99999999").status_code == 404
    assert (
        cliente.put("/api/v1/admin/promotions/99999999", json=_payload(catalogo)).status_code == 404
    )


# Paginación (§4.4)


def test_el_listado_pagina(cliente, catalogo):
    for indice in range(3):
        cliente.post("/api/v1/admin/promotions", json=_payload(catalogo, sufijo=f"p{indice}"))

    respuesta = cliente.get("/api/v1/admin/promotions?per_page=2")

    cuerpo = respuesta.get_json()
    assert len(cuerpo["data"]) == 2
    assert cuerpo["meta"]["per_page"] == 2
    assert cuerpo["meta"]["total"] >= 3


def test_el_listado_rechaza_una_pagina_mal_formada(cliente, catalogo):
    respuesta = cliente.get("/api/v1/admin/promotions?page=primera")

    assert respuesta.status_code == 422


# Auditoría (`AD-20`)


def test_cada_escritura_deja_auditoria(cliente, catalogo, administrator_id, outside):
    creada = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo)).get_json()["data"]
    cliente.put(
        f"/api/v1/admin/promotions/{creada['id']}", json=_payload(catalogo, is_active=False)
    )
    cliente.delete(f"/api/v1/admin/promotions/{creada['id']}")

    with outside.connect() as conexion:
        filas = list(
            conexion.execute(
                text(
                    "SELECT action, administrator_id, old_values, new_values FROM audit_logs "
                    "WHERE entity_type = 'promotion' AND entity_id = :i ORDER BY id"
                ),
                {"i": creada["id"]},
            ).mappings()
        )

    assert [fila["action"] for fila in filas] == ["create", "deactivate", "delete"]
    assert {fila["administrator_id"] for fila in filas} == {administrator_id}
    assert filas[0]["new_values"]["discount_percentage"] == 20


def test_fallo_de_auditoria_revierte_la_creacion(cliente, catalogo, outside, monkeypatch):
    """`CONS-05`."""
    from app.core.audit import AuditService

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    respuesta = cliente.post("/api/v1/admin/promotions", json=_payload(catalogo))

    assert respuesta.status_code == 500
    with outside.connect() as conexion:
        existentes = conexion.execute(
            text("SELECT count(*) FROM promotions WHERE name = :n"), {"n": f"{PREFIJO}-a"}
        ).scalar_one()
    assert existentes == 0
