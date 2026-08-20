"""Contrato HTTP del panel de productos (05_API.md §9.3, §9.4).

Recorre las 15 rutas registradas: códigos, envoltura `AD-16`, permisos,
auditoría, borrado lógico y restauración.
"""

import os
import threading

import pytest
from sqlalchemy import text

from app.extensions import db
from app.infrastructure.storage.local_storage import PRODUCTS_NAMESPACE, LocalStorage
from tests.fixtures.images import image_bytes, upload

SKU = "API-SKU-001"


@pytest.fixture
def catalogo(schema_app):
    """Marca, categoría y talle propios, con limpieza garantizada."""

    def limpiar():
        # Los productos de esta batería se identifican por `sku LIKE
        # 'API-SKU%'`: desde v1.2.0 el slug lo deriva el backend del nombre
        # (`Producto API` → `producto-api`, `producto-api-2`...) y ya no es un
        # valor fijo que la prueba controle, así que no sirve como patrón de
        # limpieza.
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type IN ('product', 'variant', 'image') "
                "AND entity_id IN (SELECT id FROM products WHERE sku LIKE 'API-SKU%')"
            )
        )
        for tabla in ("price_history", "images"):
            db.session.execute(
                text(
                    f"DELETE FROM {tabla} WHERE product_id IN "
                    "(SELECT id FROM products WHERE sku LIKE 'API-SKU%')"
                )
            )
        # `sales.variant_id` es RESTRICT (RN-82, igual que `price_history`):
        # hay que vaciarla antes de `variants`, no junto con las demás.
        db.session.execute(
            text(
                "DELETE FROM sales WHERE variant_id IN "
                "(SELECT id FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'API-SKU%'))"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'API-SKU%')"
            )
        )
        for tabla in ("product_sizes", "product_sports", "product_categories"):
            db.session.execute(
                text(
                    f"DELETE FROM {tabla} WHERE product_id IN "
                    "(SELECT id FROM products WHERE sku LIKE 'API-SKU%')"
                )
            )
        db.session.execute(text("DELETE FROM products WHERE sku LIKE 'API-SKU%'"))
        db.session.execute(text("DELETE FROM sizes WHERE slug LIKE 'api-%'"))
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'api-%'"))
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'api-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text(
                "INSERT INTO brands (name, slug, is_active) VALUES ('API Marca', 'api-marca', true)"
            )
        )
        db.session.execute(
            text(
                "INSERT INTO categories (name, slug, is_active) "
                "VALUES ('API Categoria', 'api-categoria', true)"
            )
        )
        size_type_id = db.session.execute(text("SELECT id FROM size_types LIMIT 1")).scalar_one()
        db.session.execute(
            text(
                "INSERT INTO sizes (name, slug, size_type_id, is_active) "
                "VALUES ('API M', 'api-m', :size_type_id, true)"
            ),
            {"size_type_id": size_type_id},
        )
        db.session.commit()

        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = 'api-marca') AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = 'api-categoria') AS category_id, "
                    "(SELECT id FROM sizes WHERE slug = 'api-m') AS size_id, "
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
        "name": "Producto API",
        # v1.2.0: el slug lo genera el backend a partir de `name`; un valor
        # aquí es tráfico ignorado, no una alternativa válida. Se envía a
        # propósito para que `test_crear_producto_ignora_el_slug_enviado`
        # pueda comprobar que no se usa.
        "slug": "slug-que-se-ignora",
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
    response = admin_client.post("/api/v1/admin/products", json=_payload(catalogo))
    assert response.status_code == 201
    return response.get_json()["data"]["id"]


# Autenticación y contrato base


def test_todas_las_rutas_de_producto_exigen_sesion(schema_app, catalogo):
    """PA-06: sin sesión, ninguna ruta del panel responde."""
    client = schema_app.test_client()
    rutas = [
        ("get", "/api/v1/admin/products"),
        ("post", "/api/v1/admin/products"),
        ("get", "/api/v1/admin/products/1"),
        ("put", "/api/v1/admin/products/1"),
        ("delete", "/api/v1/admin/products/1"),
        ("post", "/api/v1/admin/products/1/restore"),
        ("post", "/api/v1/admin/products/1/set-active"),
        ("get", "/api/v1/admin/products/1/variants"),
        ("put", "/api/v1/admin/products/1/variants/1"),
        ("delete", "/api/v1/admin/products/1/variants/1"),
        ("get", "/api/v1/admin/products/1/images"),
        ("post", "/api/v1/admin/products/1/images"),
        ("put", "/api/v1/admin/products/1/images/1"),
        ("delete", "/api/v1/admin/products/1/images/1"),
        ("post", "/api/v1/admin/products/1/images/reorder"),
        ("post", "/api/v1/admin/products/1/images/1/set-primary"),
    ]
    for metodo, ruta in rutas:
        response = getattr(client, metodo)(ruta)
        assert response.status_code == 401, f"{metodo.upper()} {ruta}"


def test_crear_producto_devuelve_201_y_envoltura_ad16(admin_client, catalogo):
    response = admin_client.post("/api/v1/admin/products", json=_payload(catalogo))

    assert response.status_code == 201
    body = response.get_json()
    assert body["success"] is True
    assert body["errors"] == []
    assert "request_id" in body["meta"]
    # v1.2.0: el slug se deriva de `name` ("Producto API"), no del campo
    # `slug` que viajó en el payload.
    assert body["data"]["slug"] == "producto-api"


def test_crear_producto_ignora_el_slug_enviado(admin_client, catalogo):
    """El slug no es un dato que el cliente decida; el backend es la fuente de verdad."""
    response = admin_client.post(
        "/api/v1/admin/products", json=_payload(catalogo, slug="lo-que-sea")
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["slug"] == "producto-api"


def test_crear_dos_productos_con_el_mismo_nombre_desambigua_el_slug(admin_client, catalogo):
    primero = admin_client.post(
        "/api/v1/admin/products", json=_payload(catalogo, sku="API-SKU-DUP-1")
    )
    segundo = admin_client.post(
        "/api/v1/admin/products", json=_payload(catalogo, sku="API-SKU-DUP-2")
    )
    tercero = admin_client.post(
        "/api/v1/admin/products", json=_payload(catalogo, sku="API-SKU-DUP-3")
    )

    assert primero.get_json()["data"]["slug"] == "producto-api"
    assert segundo.get_json()["data"]["slug"] == "producto-api-2"
    assert tercero.get_json()["data"]["slug"] == "producto-api-3"


def test_slug_se_desambigua_contra_una_fila_insertada_fuera_del_servicio(
    admin_client, catalogo, outside
):
    """La unicidad se comprueba contra la base, no contra lo que el servicio recuerda.

    Inserta el slug esperado directamente por SQL —como si otro proceso lo
    hubiera tomado justo antes— y confirma que el alta lo detecta igual.
    """
    with outside.connect() as connection:
        connection.execute(
            text(
                "INSERT INTO products "
                "(name, slug, sku, list_price, availability, is_active, "
                "primary_category_id, brand_id, gender_id, size_type_id) "
                "VALUES (:name, :slug, :sku, 100000, 'available', true, "
                ":category_id, :brand_id, :gender_id, :size_type_id)"
            ),
            {
                "name": "Otro producto",
                "slug": "producto-api",
                "sku": "API-SKU-RAW",
                "category_id": catalogo["category_id"],
                "brand_id": catalogo["brand_id"],
                "gender_id": catalogo["gender_id"],
                "size_type_id": catalogo["size_type_id"],
            },
        )
        connection.commit()

    response = admin_client.post("/api/v1/admin/products", json=_payload(catalogo))

    assert response.status_code == 201
    assert response.get_json()["data"]["slug"] == "producto-api-2"


def test_altas_concurrentes_con_el_mismo_nombre_no_chocan(schema_app, catalogo, administrator_id):
    """Segura ante concurrencia: dos altas simultáneas nunca terminan con el mismo slug."""
    from datetime import UTC, datetime

    resultados = {}
    barrera = threading.Barrier(2)

    def crear(sku, clave):
        client = schema_app.test_client()
        with client.session_transaction() as flask_session:
            flask_session["admin_id"] = administrator_id
            flask_session["logged_in_at"] = datetime.now(UTC).isoformat()
            flask_session["last_seen_at"] = datetime.now(UTC).isoformat()
        barrera.wait()
        resultados[clave] = client.post("/api/v1/admin/products", json=_payload(catalogo, sku=sku))

    hilo_a = threading.Thread(target=crear, args=("API-SKU-CONC-1", "a"))
    hilo_b = threading.Thread(target=crear, args=("API-SKU-CONC-2", "b"))
    hilo_a.start()
    hilo_b.start()
    hilo_a.join()
    hilo_b.join()

    assert resultados["a"].status_code == 201
    assert resultados["b"].status_code == 201
    slugs = {resultados["a"].get_json()["data"]["slug"], resultados["b"].get_json()["data"]["slug"]}
    assert slugs == {"producto-api", "producto-api-2"}


def test_editar_el_nombre_no_cambia_el_slug(admin_client, catalogo, producto_id):
    """No romper URLs existentes: el slug se fija al crear y no se toca después."""
    original = admin_client.get(f"/api/v1/admin/products/{producto_id}").get_json()["data"]
    assert original["slug"] == "producto-api"

    editado = admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, name="Producto API Elite"),
    )

    assert editado.status_code == 200
    assert editado.get_json()["data"]["name"] == "Producto API Elite"
    assert editado.get_json()["data"]["slug"] == "producto-api"

    # La URL pública original sigue funcionando.
    publico = admin_client.get(f"/api/v1/products/{original['slug']}")
    assert publico.status_code == 200


def test_listado_devuelve_meta_de_paginacion(admin_client, producto_id):
    response = admin_client.get("/api/v1/admin/products")

    assert response.status_code == 200
    meta = response.get_json()["meta"]
    assert {"page", "per_page", "total", "total_pages"} <= set(meta)


def test_listado_filtra_por_slug_de_marca(admin_client, producto_id):
    """§9.3: `brand` viaja como slug, no como identificador (AD-23)."""
    encontrado = admin_client.get("/api/v1/admin/products?brand=api-marca")
    vacio = admin_client.get("/api/v1/admin/products?brand=marca-inexistente")

    assert [p["id"] for p in encontrado.get_json()["data"]] == [producto_id]
    assert vacio.get_json()["data"] == []
    assert vacio.get_json()["meta"]["total"] == 0


def test_listado_filtra_por_slug_de_categoria(admin_client, producto_id):
    response = admin_client.get("/api/v1/admin/products?category=api-categoria")

    assert [p["id"] for p in response.get_json()["data"]] == [producto_id]


def test_listado_total_coincide_con_las_filas_devueltas(admin_client, producto_id):
    """Si el conteo y el listado filtran distinto, la paginación miente."""
    response = admin_client.get("/api/v1/admin/products?category=api-categoria")
    body = response.get_json()

    assert body["meta"]["total"] == len(body["data"])


def test_listado_busca_por_texto(admin_client, producto_id):
    assert len(admin_client.get(f"/api/v1/admin/products?q={SKU}").get_json()["data"]) == 1
    assert admin_client.get("/api/v1/admin/products?q=no-existe-nada").get_json()["data"] == []


def test_listado_rechaza_booleano_mal_formado(admin_client, catalogo):
    """§11: un parámetro conocido pero mal formado es 422."""
    response = admin_client.get("/api/v1/admin/products?is_active=quizas")

    assert response.status_code == 422
    assert response.get_json()["errors"][0]["field"] == "is_active"


def test_listado_ignora_parametros_desconocidos(admin_client, producto_id):
    """AD-26: un parámetro desconocido no altera la respuesta."""
    con_ruido = admin_client.get("/api/v1/admin/products?parametro_inventado=1")

    assert con_ruido.status_code == 200


def test_detalle_de_producto_inexistente_es_404(admin_client, catalogo):
    response = admin_client.get("/api/v1/admin/products/99999999")

    assert response.status_code == 404
    assert response.get_json()["errors"][0]["code"] == "resource_not_found"


def test_crear_producto_sin_campo_obligatorio_es_400(admin_client, catalogo):
    response = admin_client.post("/api/v1/admin/products", json={"name": "Incompleto"})

    assert response.status_code == 400


def test_set_active_sin_el_campo_es_400(admin_client, producto_id):
    response = admin_client.post(f"/api/v1/admin/products/{producto_id}/set-active", json={})

    assert response.status_code == 400


# Ciclo de vida


def test_borrado_logico_responde_204_y_oculta_el_producto(admin_client, producto_id, outside):
    """§9.3: soft delete devuelve 204 sin cuerpo; la fila permanece (AD-18)."""
    response = admin_client.delete(f"/api/v1/admin/products/{producto_id}")

    assert response.status_code == 204
    assert response.get_data() == b""

    with outside.connect() as connection:
        deleted_at = connection.execute(
            text("SELECT deleted_at FROM products WHERE id = :id"), {"id": producto_id}
        ).scalar_one()
    assert deleted_at is not None

    assert admin_client.get("/api/v1/admin/products").get_json()["data"] == []
    assert len(admin_client.get("/api/v1/admin/products?deleted=true").get_json()["data"]) == 1


def test_restaurar_devuelve_el_producto_al_listado(admin_client, producto_id):
    admin_client.delete(f"/api/v1/admin/products/{producto_id}")

    response = admin_client.post(f"/api/v1/admin/products/{producto_id}/restore")

    assert response.status_code == 200
    assert len(admin_client.get("/api/v1/admin/products").get_json()["data"]) == 1


def test_set_active_alterna_la_visibilidad(admin_client, producto_id):
    apagado = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/set-active", json={"is_active": False}
    )
    assert apagado.status_code == 200
    assert apagado.get_json()["data"]["is_active"] is False

    encendido = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/set-active", json={"is_active": True}
    )
    assert encendido.get_json()["data"]["is_active"] is True


def test_actualizar_producto_reemplaza_los_campos(admin_client, catalogo, producto_id):
    response = admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, name="Producto API editado", list_price=125000),
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["name"] == "Producto API editado"
    assert response.get_json()["data"]["list_price"] == 125000


# Variantes (§9.4)


def test_variantes_se_generan_al_asignar_talle(admin_client, catalogo, producto_id):
    """AD-15: las variantes se materializan al reconciliar talles."""
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )

    response = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants")

    assert response.status_code == 200
    assert len(response.get_json()["data"]) == 1


def test_eliminar_variante_responde_204(admin_client, catalogo, producto_id):
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    variant_id = variante["data"][0]["id"]

    response = admin_client.delete(f"/api/v1/admin/products/{producto_id}/variants/{variant_id}")

    assert response.status_code == 204
    assert (
        admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()["data"] == []
    )


def test_eliminar_variante_inexistente_es_404(admin_client, producto_id):
    response = admin_client.delete(f"/api/v1/admin/products/{producto_id}/variants/99999999")

    assert response.status_code == 404


# Stock real por variante (§9.4, v1.4.0, RN-38b)


def test_producto_nuevo_nace_no_disponible(admin_client, producto_id):
    """RN-38b: sin variantes con cantidad cargada, la disponibilidad es out_of_stock."""
    response = admin_client.get(f"/api/v1/admin/products/{producto_id}")

    assert response.get_json()["data"]["availability"] == "out_of_stock"


def test_disponibilidad_enviada_en_el_alta_se_ignora(admin_client, catalogo):
    """Igual que `slug`: `availability` ya no es un campo de entrada (v1.4.0)."""
    response = admin_client.post(
        "/api/v1/admin/products", json=_payload(catalogo, availability="available")
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["availability"] == "out_of_stock"


def test_cargar_cantidad_recalcula_la_disponibilidad(admin_client, catalogo, producto_id):
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    variant_id = variante["data"][0]["id"]

    respuesta = admin_client.put(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}", json={"quantity": 8}
    )
    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["quantity"] == 8
    assert respuesta.get_json()["data"]["availability"] == "available"

    producto = admin_client.get(f"/api/v1/admin/products/{producto_id}").get_json()["data"]
    assert producto["availability"] == "available"


@pytest.mark.parametrize(
    "cantidad,estado",
    [(0, "out_of_stock"), (1, "low_stock"), (5, "low_stock"), (6, "available"), (100, "available")],
)
def test_regla_exacta_de_disponibilidad(admin_client, catalogo, producto_id, cantidad, estado):
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    variant_id = variante["data"][0]["id"]

    respuesta = admin_client.put(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}", json={"quantity": cantidad}
    )

    assert respuesta.get_json()["data"]["availability"] == estado


def test_cantidad_negativa_es_422(admin_client, catalogo, producto_id):
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    variant_id = variante["data"][0]["id"]

    respuesta = admin_client.put(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}", json={"quantity": -1}
    )

    assert respuesta.status_code == 422


def _variante_con_cantidad(admin_client, catalogo, producto_id, cantidad):
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    variant_id = variante["data"][0]["id"]
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}", json={"quantity": cantidad}
    )
    return variant_id


def test_registrar_venta_descuenta_la_cantidad(admin_client, catalogo, producto_id):
    """RN-82."""
    variant_id = _variante_con_cantidad(admin_client, catalogo, producto_id, 8)

    respuesta = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}/sales",
        json={"quantity": 3},
    )

    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["quantity"] == 5


def test_registrar_venta_recalcula_la_disponibilidad(admin_client, catalogo, producto_id):
    """RN-39: la disponibilidad se deriva de la cantidad, también tras una venta."""
    variant_id = _variante_con_cantidad(admin_client, catalogo, producto_id, 6)

    respuesta = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}/sales",
        json={"quantity": 5},
    )

    assert respuesta.get_json()["data"]["availability"] == "low_stock"
    producto = admin_client.get(f"/api/v1/admin/products/{producto_id}").get_json()["data"]
    assert producto["availability"] == "low_stock"


def test_registrar_venta_por_mas_de_lo_que_hay_es_409(admin_client, catalogo, producto_id):
    """RN-82: no se puede vender más de lo que hay cargado."""
    variant_id = _variante_con_cantidad(admin_client, catalogo, producto_id, 2)

    respuesta = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}/sales",
        json={"quantity": 3},
    )

    assert respuesta.status_code == 409
    cuerpo = respuesta.get_json()
    assert cuerpo["errors"][0]["rule"] == "RN-82"

    # No debe haber descontado nada: la venta rechazada no deja rastro.
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    assert variante["data"][0]["quantity"] == 2


@pytest.mark.parametrize("cantidad", [0, -1])
def test_registrar_venta_con_cantidad_no_positiva_es_422(
    admin_client, catalogo, producto_id, cantidad
):
    variant_id = _variante_con_cantidad(admin_client, catalogo, producto_id, 5)

    respuesta = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}/sales",
        json={"quantity": cantidad},
    )

    assert respuesta.status_code == 422


def test_registrar_venta_deja_registro_en_el_ledger_inmutable(
    schema_app, admin_client, catalogo, producto_id
):
    """RN-82, mismo patrón que `price_history` (RN-70)."""
    variant_id = _variante_con_cantidad(admin_client, catalogo, producto_id, 8)

    admin_client.post(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}/sales",
        json={"quantity": 3},
    )

    with schema_app.app_context():
        fila = db.session.execute(
            text("SELECT variant_id, quantity FROM sales WHERE variant_id = :vid"),
            {"vid": variant_id},
        ).one()
        assert fila.variant_id == variant_id
        assert fila.quantity == 3


def test_registrar_venta_queda_auditada(schema_app, admin_client, catalogo, producto_id):
    """AD-20: toda escritura del panel deja auditoría."""
    variant_id = _variante_con_cantidad(admin_client, catalogo, producto_id, 8)

    admin_client.post(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}/sales",
        json={"quantity": 3},
    )

    with schema_app.app_context():
        fila = db.session.execute(
            text(
                "SELECT old_values, new_values FROM audit_logs "
                "WHERE entity_type = 'variant' AND entity_id = :vid "
                "ORDER BY id DESC LIMIT 1"
            ),
            {"vid": variant_id},
        ).one()
        assert fila.old_values["quantity"] == 8
        assert fila.new_values["quantity"] == 5


def test_eliminar_variante_con_stock_recalcula_la_disponibilidad(
    admin_client, catalogo, producto_id
):
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[catalogo["size_id"]]),
    )
    variante = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()
    variant_id = variante["data"][0]["id"]
    admin_client.put(
        f"/api/v1/admin/products/{producto_id}/variants/{variant_id}", json={"quantity": 8}
    )

    admin_client.delete(f"/api/v1/admin/products/{producto_id}/variants/{variant_id}")

    producto = admin_client.get(f"/api/v1/admin/products/{producto_id}").get_json()["data"]
    assert producto["availability"] == "out_of_stock"


def test_talle_incoherente_con_el_tipo_de_talle_del_producto_es_422(
    admin_client, schema_app, catalogo, producto_id
):
    """RN-15b: un talle debe pertenecer al `size_type` del producto."""
    with schema_app.app_context():
        otro_tipo = db.session.execute(
            text("SELECT id FROM size_types WHERE id != :actual LIMIT 1"),
            {"actual": catalogo["size_type_id"]},
        ).scalar_one_or_none()
        if otro_tipo is None:
            pytest.skip("no hay un segundo size_type sembrado para probar la incoherencia")
        talle_id = db.session.execute(
            text(
                "INSERT INTO sizes (name, slug, size_type_id, is_active) "
                "VALUES ('API Incoherente', 'api-incoherente', :tipo, true) RETURNING id"
            ),
            {"tipo": otro_tipo},
        ).scalar_one()
        db.session.commit()

    respuesta = admin_client.put(
        f"/api/v1/admin/products/{producto_id}",
        json=_payload(catalogo, size_ids=[talle_id]),
    )

    assert respuesta.status_code == 422
    assert respuesta.get_json()["errors"][0]["field"] == "size_ids"


# Imágenes (§9.3)


# §11.1 y §11.2: la validación abre la imagen con Pillow, así que la carga de
# prueba tiene que ser una imagen decodificable de tamaño admitido.
def _imagen_falsa(nombre: str = "prueba.png", contenido: bytes | None = None):
    return upload(nombre=nombre, contenido=contenido)


def test_subir_imagen_devuelve_201_y_la_marca_como_principal(admin_client, producto_id):
    """RN-20: la primera imagen del producto es la principal."""
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(),
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["is_primary"] is True


def test_subir_imagen_sin_archivo_es_400(admin_client, producto_id):
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data={},
        content_type="multipart/form-data",
    )

    assert response.status_code == 400


def test_subir_extension_no_permitida_es_422(admin_client, producto_id):
    """§11.1: conjunto cerrado de extensiones."""
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="script.php"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422


def test_subir_doble_extension_es_422(admin_client, producto_id):
    """§11.2: rechazo de doble extensión (`foto.jpg.php`)."""
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="foto.jpg.php"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422


def test_subir_contenido_que_no_es_imagen_es_422(admin_client, producto_id):
    """§11.2: el MIME se valida por magic bytes, no por la extensión declarada."""
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="disfrazado.png", contenido=b"<?php echo 1; ?>"),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422


def test_subir_imagen_truncada_es_422(admin_client, producto_id):
    """§11.2: una firma correcta seguida de basura no es una imagen válida."""
    truncada = image_bytes()[:40]

    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="truncada.png", contenido=truncada),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422


def test_subir_imagen_demasiado_pequena_es_422(admin_client, producto_id):
    """§11.1: mínimo 200x200 px."""
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="chica.png", contenido=image_bytes(size=(199, 300))),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422
    assert "200x200" in response.get_json()["errors"][0]["detail"]


def test_subir_imagen_demasiado_grande_es_422(admin_client, producto_id):
    """§11.1: máximo 4000x4000 px."""
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="enorme.png", contenido=image_bytes(size=(4001, 300))),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422
    assert "4000x4000" in response.get_json()["errors"][0]["detail"]


def test_acepta_los_tres_formatos_admitidos(admin_client, producto_id):
    """§11.1: JPEG, PNG y WebP."""
    for nombre, formato in (("a.png", "PNG"), ("b.jpg", "JPEG"), ("c.webp", "WEBP")):
        response = admin_client.post(
            f"/api/v1/admin/products/{producto_id}/images",
            data=_imagen_falsa(nombre=nombre, contenido=image_bytes(image_format=formato)),
            content_type="multipart/form-data",
        )
        assert response.status_code == 201, nombre


def test_rechaza_svg(admin_client, producto_id):
    """02_ARQUITECTURA.md §15.6: el SVG no se admite; puede contener script."""
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'

    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="vector.svg", contenido=svg),
        content_type="multipart/form-data",
    )

    assert response.status_code == 422


def test_la_extension_del_original_sale_de_la_firma_real(schema_app, admin_client, producto_id):
    """§11.3: el original se nombra por su firma, no por la extensión declarada.

    El derivado que se publica siempre es WebP (§15.6), así que la comprobación
    tiene que mirar la rama de originales, que es donde la firma decide.
    """
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(nombre="contenido-png.jpg", contenido=image_bytes()),
        content_type="multipart/form-data",
    )

    assert response.status_code == 201
    assert response.get_json()["data"]["image_url"].endswith(".webp")

    with schema_app.app_context():
        storage = LocalStorage()
        originales = os.listdir(
            os.path.join(storage.originals_path, PRODUCTS_NAMESPACE, str(producto_id))
        )
        assert all(nombre.endswith(".png") for nombre in originales)
        storage.purge_product(producto_id)


def test_ciclo_completo_de_imagenes(admin_client, producto_id):
    primera = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(),
        content_type="multipart/form-data",
    ).get_json()["data"]
    segunda = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=_imagen_falsa(),
        content_type="multipart/form-data",
    ).get_json()["data"]

    listado = admin_client.get(f"/api/v1/admin/products/{producto_id}/images")
    assert len(listado.get_json()["data"]) == 2

    editada = admin_client.put(
        f"/api/v1/admin/products/{producto_id}/images/{segunda['id']}",
        json={"alt_text": "texto alternativo"},
    )
    assert editada.get_json()["data"]["alt_text"] == "texto alternativo"

    principal = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images/{segunda['id']}/set-primary"
    )
    assert principal.status_code == 200
    assert principal.get_json()["data"]["is_primary"] is True

    reordenadas = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images/reorder",
        json={"image_ids": [segunda["id"], primera["id"]]},
    )
    assert [i["id"] for i in reordenadas.get_json()["data"]] == [segunda["id"], primera["id"]]

    borrada = admin_client.delete(f"/api/v1/admin/products/{producto_id}/images/{primera['id']}")
    assert borrada.status_code == 200
    assert (
        len(admin_client.get(f"/api/v1/admin/products/{producto_id}/images").get_json()["data"])
        == 1
    )


def test_reorder_con_entrada_invalida_es_400(admin_client, producto_id):
    response = admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images/reorder", json={"image_ids": "no-es-lista"}
    )

    assert response.status_code == 400


def test_imagen_inexistente_es_404(admin_client, producto_id):
    response = admin_client.put(
        f"/api/v1/admin/products/{producto_id}/images/99999999", json={"alt_text": "x"}
    )

    assert response.status_code == 404


# Auditoría de las escrituras de producto (AD-20)


def test_cada_escritura_de_producto_deja_auditoria(
    admin_client, catalogo, administrator_id, producto_id, outside
):
    admin_client.put(f"/api/v1/admin/products/{producto_id}", json=_payload(catalogo))
    admin_client.post(f"/api/v1/admin/products/{producto_id}/set-active", json={"is_active": False})
    admin_client.delete(f"/api/v1/admin/products/{producto_id}")
    admin_client.post(f"/api/v1/admin/products/{producto_id}/restore")

    with outside.connect() as connection:
        acciones = [
            row[0]
            for row in connection.execute(
                text(
                    "SELECT action FROM audit_logs WHERE entity_type = 'product' "
                    "AND entity_id = :id ORDER BY id"
                ),
                {"id": producto_id},
            )
        ]

    assert acciones == ["create", "update", "deactivate", "delete", "activate"]
