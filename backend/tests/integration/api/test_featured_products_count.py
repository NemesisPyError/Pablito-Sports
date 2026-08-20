"""Cuántos destacados publica la portada (`RF-35`, 04 §9.2.14).

El ajuste vive en `store_settings` y **no** viaja en `StoreSettingsPublicDTO`
(§10.2): el cliente no lo conoce, así que lo aplica el servidor al paginar. Sin
esto la portada mostraba un número fijo e ignoraba lo que el panel prometía.

Los tests fijan además el límite de la regla: sólo afecta al listado de
destacados sin `per_page` explícito. Cualquier otro listado conserva §4.4.
"""

import pytest
from sqlalchemy import text

from app.extensions import db

RUTA = "/api/v1/products"


def _datos(respuesta):
    assert respuesta.status_code == 200, respuesta.get_json()
    return respuesta.get_json()["data"]


def _meta(respuesta):
    return respuesta.get_json()["meta"]


@pytest.fixture
def configurar_destacados(schema_app):
    """Fija `featured_products_count` y restaura el valor original al salir."""
    with schema_app.app_context():
        original = db.session.execute(
            text("SELECT featured_products_count FROM store_settings WHERE id = 1")
        ).scalar_one_or_none()

    def fijar(cantidad: int):
        with schema_app.app_context():
            db.session.execute(
                text("UPDATE store_settings SET featured_products_count = :c WHERE id = 1"),
                {"c": cantidad},
            )
            db.session.commit()

    yield fijar

    if original is not None:
        fijar(original)


def test_el_listado_de_destacados_respeta_la_configuracion(catalog_client, configurar_destacados):
    configurar_destacados(1)

    respuesta = catalog_client.get(f"{RUTA}?is_featured=true")

    assert len(_datos(respuesta)) == 1
    assert _meta(respuesta)["per_page"] == 1


def test_cambiar_la_configuracion_cambia_lo_que_devuelve(catalog_client, configurar_destacados):
    """Es la garantía que faltaba: el panel promete y el catálogo cumple."""
    configurar_destacados(1)
    con_uno = len(_datos(catalog_client.get(f"{RUTA}?is_featured=true")))

    configurar_destacados(2)
    con_dos = len(_datos(catalog_client.get(f"{RUTA}?is_featured=true")))

    assert con_uno == 1
    assert con_dos == 2


def test_un_per_page_explicito_manda_sobre_la_configuracion(catalog_client, configurar_destacados):
    """Quien pide un tamaño concreto lo recibe: la regla es sólo el defecto."""
    configurar_destacados(1)

    respuesta = catalog_client.get(f"{RUTA}?is_featured=true&per_page=2")

    assert _meta(respuesta)["per_page"] == 2


def test_no_afecta_al_catalogo_sin_filtro_de_destacados(catalog_client, configurar_destacados):
    """§4.4 sigue rigiendo para el resto de los listados."""
    configurar_destacados(1)

    respuesta = catalog_client.get(RUTA)

    assert _meta(respuesta)["per_page"] == 20


def test_no_afecta_a_otros_filtros(catalog_client, configurar_destacados):
    configurar_destacados(1)

    respuesta = catalog_client.get(f"{RUTA}?is_new=true")

    assert _meta(respuesta)["per_page"] == 20


def test_is_featured_false_no_activa_la_regla(catalog_client, configurar_destacados):
    """La regla es del listado de destacados, no de la presencia del parámetro."""
    configurar_destacados(1)

    respuesta = catalog_client.get(f"{RUTA}?is_featured=false")

    assert _meta(respuesta)["per_page"] == 20


def test_el_total_sigue_siendo_el_de_todos_los_destacados(catalog_client, configurar_destacados):
    """`meta.total` cuenta el conjunto, no la página: la portada muestra menos."""
    configurar_destacados(1)

    meta = _meta(catalog_client.get(f"{RUTA}?is_featured=true"))

    assert meta["total"] >= 1
    assert meta["per_page"] == 1


def test_una_configuracion_desmedida_respeta_el_maximo(catalog_client, configurar_destacados):
    """§4.4: el tope de `per_page` se sigue aplicando."""
    configurar_destacados(500)

    assert _meta(catalog_client.get(f"{RUTA}?is_featured=true"))["per_page"] == 100
