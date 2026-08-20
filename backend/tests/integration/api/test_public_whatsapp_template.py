"""Plantilla pública de WhatsApp (`RN-59`).

La plantilla que edita el administrador debe ser la que compone el mensaje del
cliente. Estos tests fijan las dos mitades de esa garantía: que el catálogo la
puede leer, y que leerla **no** abre la puerta al resto de la configuración de
panel.

`StoreSettingsPublicDTO` (§10.2) no cambia: se verifica explícitamente.
"""

import pytest
from sqlalchemy import text

from app.extensions import db

RUTA = "/api/v1/store/whatsapp-template"
RUTA_SETTINGS = "/api/v1/store/settings"
RUTA_ADMIN = "/api/v1/admin/store/whatsapp-template"

CAMPOS_DTO = {"message_template", "item_template"}

# Campos de panel que no deben cruzar al contrato público.
CAMPOS_PRIVADOS = ("featured_products_count", "address", "business_hours", "social_links")


def _datos(respuesta):
    assert respuesta.status_code == 200, respuesta.get_json()
    cuerpo = respuesta.get_json()
    assert cuerpo["success"] is True
    return cuerpo["data"]


def test_responde_200(catalog_client):
    assert catalog_client.get(RUTA).status_code == 200


def test_expone_exactamente_las_dos_plantillas(catalog_client):
    assert set(_datos(catalog_client.get(RUTA))) == CAMPOS_DTO


def test_no_expone_el_resto_de_la_configuracion(catalog_client):
    """El contador de destacados y los datos de contacto son de panel."""
    datos = _datos(catalog_client.get(RUTA))

    for campo in CAMPOS_PRIVADOS:
        assert campo not in datos


def test_no_es_anonimo_por_accidente(catalog_client):
    """Es un recurso público: se lee sin sesión, como el resto de §7."""
    assert catalog_client.get(RUTA).status_code == 200


def test_store_settings_sigue_sin_exponer_las_plantillas(catalog_client):
    """§10.2 no cambia: la plantilla vive en su propio recurso."""
    datos = _datos(catalog_client.get(RUTA_SETTINGS))

    assert set(datos) == {
        "store_name",
        "whatsapp_number",
        "address",
        "business_hours",
        "social_links",
    }
    assert "message_template" not in datos
    assert "item_template" not in datos


def test_sin_configuracion_inicializada_es_404(schema_app):
    """Mismo criterio que §7.1."""
    client = schema_app.test_client()
    with schema_app.app_context():
        existentes = db.session.execute(text("SELECT COUNT(*) FROM store_settings")).scalar_one()

    if existentes:
        pytest.skip("la configuración está inicializada en este entorno")
    assert client.get(RUTA).status_code == 404


def test_refleja_lo_que_guarda_el_panel(schema_app, admin_client, catalog_client):
    """`RN-59` de punta a punta: panel → base → catálogo.

    Es la garantía que faltaba: antes el administrador editaba una plantilla que
    el catálogo nunca llegaba a ver.
    """
    nueva = "Hola {{tienda}}! Quiero consultar:\n{{items}}\nTotal: {{total}}"
    original = _datos(catalog_client.get(RUTA))

    try:
        respuesta = admin_client.put(
            RUTA_ADMIN,
            json={"message_template": nueva, "item_template": "- {{producto}} x{{cantidad}}"},
        )
        assert respuesta.status_code == 200, respuesta.get_json()

        publico = _datos(catalog_client.get(RUTA))
        assert publico["message_template"] == nueva
        assert publico["item_template"] == "- {{producto}} x{{cantidad}}"
    finally:
        # El catálogo es una fixture de sesión: se restaura lo que había.
        admin_client.put(RUTA_ADMIN, json=original)


def test_restaurar_por_defecto_tambien_llega_al_catalogo(schema_app, admin_client, catalog_client):
    """`RN-61`: restaurar en el panel cambia lo que recibe el cliente."""
    from app.core.utils.whatsapp_defaults import DEFAULT_MESSAGE_TEMPLATE

    original = _datos(catalog_client.get(RUTA))

    try:
        assert admin_client.post(f"{RUTA_ADMIN}/reset").status_code == 200

        assert _datos(catalog_client.get(RUTA))["message_template"] == DEFAULT_MESSAGE_TEMPLATE
    finally:
        admin_client.put(RUTA_ADMIN, json=original)
