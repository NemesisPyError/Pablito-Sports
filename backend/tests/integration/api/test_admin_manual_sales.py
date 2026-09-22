"""Registro manual de ventas desde el panel (05_API.md §9.19, RN-82).

Lo que se prueba acá no es "que grabe": es que **no pueda grabar mal**. Una
venta descuenta stock, y el stock es el único número de este sistema que no se
puede reconstruir si se corrompe.

Tres propiedades sostienen la batería:

  1. **Atomicidad.** Si una línea falla, no se descuenta ninguna otra y no queda
     ni la cabecera. La transacción la abre `@transactional`.
  2. **Snapshot de precio.** Lo que se guarda en la línea es el precio de ese
     momento; cambiar el precio del producto después no la toca.
  3. **Concurrencia.** Dos ventas simultáneas por el mismo talle no pueden
     vender más unidades de las que hay. Se reutiliza el `SELECT ... FOR UPDATE`
     de S-04 (`find_variant_for_update`), y el test lo demuestra con hilos
     reales soltados por una barrera, igual que `test_admin_products.py`.
"""

import threading

import pytest
from sqlalchemy import text

from app.extensions import db

SKU = "SALE-SKU-001"
SKU_SEGUNDO = "SALE-SKU-002"


@pytest.fixture
def catalogo(schema_app):
    """Marca, categoría y dos talles propios, con limpieza garantizada."""

    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type IN ('product', 'variant') "
                "AND entity_id IN (SELECT id FROM products WHERE sku LIKE 'SALE-SKU%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM price_history WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'SALE-SKU%')"
            )
        )
        # Orden obligado por las FK RESTRICT: primero las líneas, después las
        # cabeceras que quedaron sin líneas, y recién ahí las variantes.
        db.session.execute(
            text(
                "DELETE FROM sales WHERE variant_id IN "
                "(SELECT id FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'SALE-SKU%'))"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM sale_orders WHERE id NOT IN "
                "(SELECT DISTINCT sale_order_id FROM sales WHERE sale_order_id IS NOT NULL)"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM variants WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'SALE-SKU%')"
            )
        )
        for tabla in ("product_sizes", "product_sports", "product_categories", "product_genders"):
            db.session.execute(
                text(
                    f"DELETE FROM {tabla} WHERE product_id IN "
                    "(SELECT id FROM products WHERE sku LIKE 'SALE-SKU%')"
                )
            )
        db.session.execute(text("DELETE FROM products WHERE sku LIKE 'SALE-SKU%'"))
        db.session.execute(text("DELETE FROM sizes WHERE slug LIKE 'sale-%'"))
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'sale-%'"))
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'sale-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text(
                "INSERT INTO brands (name, slug, is_active) "
                "VALUES ('Sale Marca', 'sale-marca', true)"
            )
        )
        db.session.execute(
            text(
                "INSERT INTO categories (name, slug, is_active) "
                "VALUES ('Sale Categoria', 'sale-categoria', true)"
            )
        )
        size_type_id = db.session.execute(text("SELECT id FROM size_types LIMIT 1")).scalar_one()
        for nombre, slug in (("Sale M", "sale-m"), ("Sale L", "sale-l")):
            db.session.execute(
                text(
                    "INSERT INTO sizes (name, slug, size_type_id, is_active) "
                    "VALUES (:nombre, :slug, :size_type_id, true)"
                ),
                {"nombre": nombre, "slug": slug, "size_type_id": size_type_id},
            )
        db.session.commit()

        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = 'sale-marca') AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = 'sale-categoria') AS category_id, "
                    "(SELECT id FROM sizes WHERE slug = 'sale-m') AS size_m, "
                    "(SELECT id FROM sizes WHERE slug = 'sale-l') AS size_l, "
                    "(SELECT id FROM genders ORDER BY id LIMIT 1) AS gender_id, "
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
        "name": "Producto Venta",
        "sku": SKU,
        "list_price": 150000,
        "primary_category_id": catalogo["category_id"],
        "brand_id": catalogo["brand_id"],
        "gender_ids": [catalogo["gender_id"]],
        "size_type_id": catalogo["size_type_id"],
    }
    base.update(overrides)
    return base


def _crear_producto_con_stock(admin_client, catalogo, *, sku, nombre, talles, stock):
    """Producto con una variante por talle y `stock` unidades en cada una."""
    alta = admin_client.post(
        "/api/v1/admin/products",
        json=_payload(catalogo, sku=sku, name=nombre, size_ids=talles),
    )
    assert alta.status_code == 201, alta.get_json()
    producto_id = alta.get_json()["data"]["id"]

    variantes = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()[
        "data"
    ]
    for variante in variantes:
        respuesta = admin_client.put(
            f"/api/v1/admin/products/{producto_id}/variants/{variante['id']}",
            json={"quantity": stock},
        )
        assert respuesta.status_code == 200
    return producto_id, variantes


@pytest.fixture
def producto(admin_client, catalogo):
    """Un producto con dos talles, 10 unidades cada uno."""
    producto_id, variantes = _crear_producto_con_stock(
        admin_client,
        catalogo,
        sku=SKU,
        nombre="Producto Venta",
        talles=[catalogo["size_m"], catalogo["size_l"]],
        stock=10,
    )
    return {"id": producto_id, "variantes": variantes}


def _stock(admin_client, producto_id, variant_id) -> int:
    datos = admin_client.get(f"/api/v1/admin/products/{producto_id}/variants").get_json()["data"]
    return next(v["quantity"] for v in datos if v["id"] == variant_id)


def _linea(producto_id, variant_id, cantidad, **extra):
    linea = {"product_id": producto_id, "variant_id": variant_id, "quantity": cantidad}
    linea.update(extra)
    return linea


# ---------------------------------------------------------------------------
# Autenticación y contrato
# ---------------------------------------------------------------------------


def test_sin_sesion_no_se_puede_registrar_una_venta(schema_app):
    """PA-06: no existe versión pública de este recurso."""
    client = schema_app.test_client()

    respuesta = client.post("/api/v1/admin/sales", json={"items": []})

    assert respuesta.status_code == 401


def test_venta_de_una_linea_devuelve_201_y_envoltura_ad16(admin_client, producto):
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 2)]},
    )

    assert respuesta.status_code == 201
    cuerpo = respuesta.get_json()
    assert cuerpo["success"] is True
    assert cuerpo["errors"] == []
    assert cuerpo["data"]["total_amount"] == 300000
    assert len(cuerpo["data"]["items"]) == 1


def test_la_venta_descuenta_el_stock_de_la_variante(admin_client, producto):
    variante = producto["variantes"][0]

    admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 3)]},
    )

    assert _stock(admin_client, producto["id"], variante["id"]) == 7


def test_vender_un_talle_no_toca_los_demas(admin_client, producto):
    """El stock vive en la variante: vender M no puede mover L."""
    m, ele = producto["variantes"]

    admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], m["id"], 2)]},
    )

    assert _stock(admin_client, producto["id"], m["id"]) == 8
    assert _stock(admin_client, producto["id"], ele["id"]) == 10


# ---------------------------------------------------------------------------
# Varias líneas
# ---------------------------------------------------------------------------


def test_venta_con_varias_lineas_descuenta_cada_una(admin_client, producto):
    m, ele = producto["variantes"]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={
            "items": [
                _linea(producto["id"], m["id"], 2),
                _linea(producto["id"], ele["id"], 1),
            ]
        },
    )

    assert respuesta.status_code == 201
    assert _stock(admin_client, producto["id"], m["id"]) == 8
    assert _stock(admin_client, producto["id"], ele["id"]) == 9


def test_el_total_es_la_suma_de_los_subtotales(admin_client, producto):
    m, ele = producto["variantes"]

    cuerpo = admin_client.post(
        "/api/v1/admin/sales",
        json={
            "items": [
                _linea(producto["id"], m["id"], 2, unit_price=150000),
                _linea(producto["id"], ele["id"], 1, unit_price=120000),
            ]
        },
    ).get_json()["data"]

    assert [linea["subtotal"] for linea in cuerpo["items"]] == [300000, 120000]
    assert cuerpo["total_amount"] == 420000


def test_venta_con_dos_productos_distintos(admin_client, catalogo, producto):
    segundo_id, segundas = _crear_producto_con_stock(
        admin_client,
        catalogo,
        sku=SKU_SEGUNDO,
        nombre="Segundo Producto Venta",
        talles=[catalogo["size_m"]],
        stock=4,
    )

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={
            "items": [
                _linea(producto["id"], producto["variantes"][0]["id"], 1),
                _linea(segundo_id, segundas[0]["id"], 2),
            ]
        },
    )

    assert respuesta.status_code == 201
    assert _stock(admin_client, producto["id"], producto["variantes"][0]["id"]) == 9
    assert _stock(admin_client, segundo_id, segundas[0]["id"]) == 2


def test_la_misma_variante_dos_veces_se_rechaza(admin_client, producto):
    """El panel fusiona las líneas; si igual llegan dos, no se adivina."""
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={
            "items": [
                _linea(producto["id"], variante["id"], 1),
                _linea(producto["id"], variante["id"], 2),
            ]
        },
    )

    assert respuesta.status_code == 422
    assert _stock(admin_client, producto["id"], variante["id"]) == 10


# ---------------------------------------------------------------------------
# Precio
# ---------------------------------------------------------------------------


def test_sin_precio_explicito_toma_el_precio_vigente(admin_client, producto):
    variante = producto["variantes"][0]

    cuerpo = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1)]},
    ).get_json()["data"]

    assert cuerpo["items"][0]["unit_price"] == 150000


def test_un_precio_explicito_reemplaza_al_vigente(admin_client, producto):
    """El negocio puede registrar una venta hecha a otro precio."""
    variante = producto["variantes"][0]

    cuerpo = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 2, unit_price=99000)]},
    ).get_json()["data"]

    assert cuerpo["items"][0]["unit_price"] == 99000
    assert cuerpo["total_amount"] == 198000


def test_el_precio_guardado_no_cambia_si_despues_cambia_el_del_producto(
    admin_client, catalogo, producto, outside
):
    """El snapshot es el punto: la venta de ayer no se reescribe sola."""
    variante = producto["variantes"][0]
    admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1)]},
    )

    actualizacion = admin_client.put(
        f"/api/v1/admin/products/{producto['id']}",
        json=_payload(
            catalogo,
            list_price=200000,
            size_ids=[catalogo["size_m"], catalogo["size_l"]],
        ),
    )
    assert actualizacion.status_code == 200

    with outside.connect() as conexion:
        guardado = conexion.execute(
            text("SELECT unit_price FROM sales WHERE variant_id = :id ORDER BY id DESC LIMIT 1"),
            {"id": variante["id"]},
        ).scalar_one()

    assert guardado == 150000


def test_un_precio_de_cero_es_valido(admin_client, producto):
    """Una entrega sin cargo es una venta con precio cero, no un error."""
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1, unit_price=0)]},
    )

    assert respuesta.status_code == 201
    assert respuesta.get_json()["data"]["total_amount"] == 0


# ---------------------------------------------------------------------------
# Atribución
# ---------------------------------------------------------------------------


def test_la_venta_queda_atribuida_al_administrador(
    admin_client, producto, administrator_id, outside
):
    variante = producto["variantes"][0]

    cuerpo = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1)]},
    ).get_json()["data"]

    assert cuerpo["administrator_id"] == administrator_id
    with outside.connect() as conexion:
        fila = conexion.execute(
            text(
                "SELECT administrator_id, sale_order_id FROM sales "
                "WHERE variant_id = :id ORDER BY id DESC LIMIT 1"
            ),
            {"id": variante["id"]},
        ).one()

    assert fila.administrator_id == administrator_id
    assert fila.sale_order_id == cuerpo["id"]


def test_la_venta_registra_fecha_y_hora(admin_client, producto):
    variante = producto["variantes"][0]

    cuerpo = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1)]},
    ).get_json()["data"]

    assert cuerpo["created_at"] is not None


# ---------------------------------------------------------------------------
# Validación de la entrada
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "cantidad",
    [0, -1, 1.5, "2", None, True],
    ids=["cero", "negativa", "decimal", "texto", "nula", "booleana"],
)
def test_cantidad_invalida_responde_422(admin_client, producto, cantidad):
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], cantidad)]},
    )

    assert respuesta.status_code == 422, cantidad
    assert _stock(admin_client, producto["id"], variante["id"]) == 10


@pytest.mark.parametrize(
    "precio", [-1, 1.5, "1000", True], ids=["negativo", "decimal", "texto", "booleano"]
)
def test_precio_invalido_responde_422(admin_client, producto, precio):
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1, unit_price=precio)]},
    )

    assert respuesta.status_code == 422, precio


@pytest.mark.parametrize(
    "cuerpo",
    [
        {},
        {"items": None},
        {"items": "dos"},
        {"items": []},
        {"items": [["no", "es", "objeto"]]},
        {"items": [{"product_id": "uno", "variant_id": 1, "quantity": 1}]},
        {"items": [{"product_id": 1, "variant_id": None, "quantity": 1}]},
    ],
    ids=[
        "vacio",
        "nulo",
        "texto",
        "lista-vacia",
        "linea-no-objeto",
        "producto-texto",
        "variante-nula",
    ],
)
def test_json_con_tipos_incorrectos_responde_422(admin_client, cuerpo):
    """S-13: un tipo equivocado es 422, nunca un 500."""
    respuesta = admin_client.post("/api/v1/admin/sales", json=cuerpo)

    assert respuesta.status_code == 422, cuerpo


def test_cuerpo_que_no_es_objeto_responde_400(admin_client):
    respuesta = admin_client.post("/api/v1/admin/sales", json=[1, 2, 3])

    assert respuesta.status_code == 400


def test_producto_inexistente_responde_404(admin_client):
    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(999999, 999999, 1)]},
    )

    assert respuesta.status_code == 404


def test_variante_inexistente_responde_404(admin_client, producto):
    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], 999999, 1)]},
    )

    assert respuesta.status_code == 404


def test_variante_de_otro_producto_responde_404(admin_client, catalogo, producto):
    """La variante tiene que pertenecer al producto de la línea."""
    segundo_id, _ = _crear_producto_con_stock(
        admin_client,
        catalogo,
        sku=SKU_SEGUNDO,
        nombre="Segundo Producto Venta",
        talles=[catalogo["size_m"]],
        stock=4,
    )

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(segundo_id, producto["variantes"][0]["id"], 1)]},
    )

    assert respuesta.status_code == 404


# ---------------------------------------------------------------------------
# Stock insuficiente y atomicidad
# ---------------------------------------------------------------------------


def test_stock_insuficiente_rechaza_la_venta(admin_client, producto):
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 11)]},
    )

    assert respuesta.status_code == 409
    assert _stock(admin_client, producto["id"], variante["id"]) == 10


def test_si_una_linea_falla_no_se_descuenta_ninguna(admin_client, producto, outside):
    """Atomicidad: la línea buena tampoco se aplica.

    Es el caso que hace inútil cualquier implementación por líneas sueltas: la
    primera línea alcanza y la segunda no, así que sin una transacción única el
    stock quedaría descontado a medias y sin venta que lo explique.
    """
    m, ele = producto["variantes"]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={
            "items": [
                _linea(producto["id"], m["id"], 2),
                _linea(producto["id"], ele["id"], 99),
            ]
        },
    )

    assert respuesta.status_code == 409
    assert _stock(admin_client, producto["id"], m["id"]) == 10
    assert _stock(admin_client, producto["id"], ele["id"]) == 10

    with outside.connect() as conexion:
        lineas = conexion.execute(
            text("SELECT COUNT(*) FROM sales WHERE variant_id IN (:m, :l)"),
            {"m": m["id"], "l": ele["id"]},
        ).scalar_one()

    assert lineas == 0, "no debe quedar ninguna línea de una venta que falló"


def test_una_venta_fallida_no_deja_cabecera(admin_client, producto, outside):
    """`sale_orders` se inserta antes que las líneas: el rollback debe llevársela."""
    variante = producto["variantes"][0]
    with outside.connect() as conexion:
        antes = conexion.execute(text("SELECT COUNT(*) FROM sale_orders")).scalar_one()

    admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 99)]},
    )

    with outside.connect() as conexion:
        despues = conexion.execute(text("SELECT COUNT(*) FROM sale_orders")).scalar_one()

    assert despues == antes


# ---------------------------------------------------------------------------
# Desborde monetario
#
# `sale_orders.total_amount` es INTEGER. Antes, una cantidad absurda no daba un
# error de validación sino un desborde al insertar la cabecera: un 500. Lo
# encontró la verificación E2E pidiendo 99.999 unidades de un producto de
# 585.000 — el total no entraba en la columna.
# ---------------------------------------------------------------------------


def test_una_cantidad_absurda_es_422_y_no_un_500(admin_client, producto):
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 99999)]},
    )

    assert respuesta.status_code == 422


def test_un_precio_que_no_entra_en_la_columna_es_422(admin_client, producto):
    variante = producto["variantes"][0]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={"items": [_linea(producto["id"], variante["id"], 1, unit_price=2_147_483_648)]},
    )

    assert respuesta.status_code == 422


def test_un_total_que_desborda_sumando_lineas_validas_es_422(admin_client, producto):
    """Cada línea entra en la columna; la suma no.

    Es el caso que las cotas por campo no atrapan: hay que comprobar el total.
    """
    m, ele = producto["variantes"]

    respuesta = admin_client.post(
        "/api/v1/admin/sales",
        json={
            "items": [
                _linea(producto["id"], m["id"], 1, unit_price=2_000_000_000),
                _linea(producto["id"], ele["id"], 1, unit_price=2_000_000_000),
            ]
        },
    )

    assert respuesta.status_code == 422
    assert _stock(admin_client, producto["id"], m["id"]) == 10


# ---------------------------------------------------------------------------
# Concurrencia (S-04): lo más importante de esta batería
# ---------------------------------------------------------------------------


def _cliente_autenticado(schema_app, administrator_id):
    from datetime import UTC, datetime

    client = schema_app.test_client()
    with client.session_transaction() as flask_session:
        flask_session["admin_id"] = administrator_id
        flask_session["logged_in_at"] = datetime.now(UTC).isoformat()
        flask_session["last_seen_at"] = datetime.now(UTC).isoformat()
    return client


def _vender_en_paralelo(schema_app, administrator_id, cuerpos):
    """Una venta por hilo, todas soltadas a la vez por la barrera."""
    resultados = {}
    barrera = threading.Barrier(len(cuerpos))

    def vender(cuerpo, clave):
        client = _cliente_autenticado(schema_app, administrator_id)
        barrera.wait(timeout=30)
        resultados[clave] = client.post("/api/v1/admin/sales", json=cuerpo)

    hilos = [
        threading.Thread(target=vender, args=(cuerpo, indice))
        for indice, cuerpo in enumerate(cuerpos)
    ]
    for hilo in hilos:
        hilo.start()
    for hilo in hilos:
        hilo.join(timeout=60)

    assert len(resultados) == len(cuerpos), "algun hilo no termino"
    return [resultados[i] for i in range(len(cuerpos))]


def _stock_confirmado(outside, variant_id: int) -> int:
    with outside.connect() as conexion:
        return conexion.execute(
            text("SELECT quantity FROM variants WHERE id = :id"), {"id": variant_id}
        ).scalar_one()


def _unidades_vendidas(outside, variant_id: int) -> int:
    with outside.connect() as conexion:
        return conexion.execute(
            text("SELECT COALESCE(SUM(quantity), 0) FROM sales WHERE variant_id = :id"),
            {"id": variant_id},
        ).scalar_one()


def test_dos_ventas_concurrentes_no_venden_mas_de_lo_que_hay(
    schema_app, admin_client, catalogo, administrator_id, outside
):
    """La propiedad que no puede fallar nunca.

    Hay 3 unidades y dos ventas simultáneas piden 2 cada una. Sin el bloqueo de
    fila, ambas leen 3, ambas pasan la comprobación y el stock termina en 1
    habiendo vendido 4. Con `SELECT ... FOR UPDATE`, la segunda espera al
    `commit` de la primera, vuelve a leer 1 y se rechaza.
    """
    producto_id, variantes = _crear_producto_con_stock(
        admin_client,
        catalogo,
        sku=SKU,
        nombre="Producto Venta",
        talles=[catalogo["size_m"]],
        stock=3,
    )
    variant_id = variantes[0]["id"]

    cuerpo = {"items": [_linea(producto_id, variant_id, 2)]}
    respuestas = _vender_en_paralelo(schema_app, administrator_id, [cuerpo, cuerpo])

    codigos = sorted(r.status_code for r in respuestas)
    assert codigos == [201, 409], f"se esperaba una venta y un rechazo, hubo {codigos}"
    assert _stock_confirmado(outside, variant_id) == 1
    assert _unidades_vendidas(outside, variant_id) == 2


def test_ventas_concurrentes_que_caben_se_registran_las_dos(
    schema_app, admin_client, catalogo, administrator_id, outside
):
    """El bloqueo serializa, no rechaza de más: si hay stock, pasan las dos."""
    producto_id, variantes = _crear_producto_con_stock(
        admin_client,
        catalogo,
        sku=SKU,
        nombre="Producto Venta",
        talles=[catalogo["size_m"]],
        stock=5,
    )
    variant_id = variantes[0]["id"]

    cuerpo = {"items": [_linea(producto_id, variant_id, 2)]}
    respuestas = _vender_en_paralelo(schema_app, administrator_id, [cuerpo, cuerpo])

    assert [r.status_code for r in respuestas] == [201, 201]
    assert _stock_confirmado(outside, variant_id) == 1
    assert _unidades_vendidas(outside, variant_id) == 4


def test_ventas_multilinea_cruzadas_no_se_bloquean_entre_si(
    schema_app, admin_client, catalogo, administrator_id, outside
):
    """Dos ventas con las mismas dos variantes en orden inverso.

    Si cada transacción bloqueara en el orden en que llegan las líneas, la
    primera tendría M esperando L y la segunda L esperando M: interbloqueo, y
    PostgreSQL mataría una con un error de deadlock (que el panel vería como un
    500). El servicio ordena las líneas por `variant_id` antes de bloquear, así
    que ambas piden los candados en la misma secuencia y la segunda espera.
    """
    producto_id, variantes = _crear_producto_con_stock(
        admin_client,
        catalogo,
        sku=SKU,
        nombre="Producto Venta",
        talles=[catalogo["size_m"], catalogo["size_l"]],
        stock=5,
    )
    m, ele = variantes[0]["id"], variantes[1]["id"]

    directo = {"items": [_linea(producto_id, m, 1), _linea(producto_id, ele, 1)]}
    inverso = {"items": [_linea(producto_id, ele, 1), _linea(producto_id, m, 1)]}
    respuestas = _vender_en_paralelo(schema_app, administrator_id, [directo, inverso])

    assert [r.status_code for r in respuestas] == [201, 201], [r.get_json() for r in respuestas]
    assert _stock_confirmado(outside, m) == 3
    assert _stock_confirmado(outside, ele) == 3
