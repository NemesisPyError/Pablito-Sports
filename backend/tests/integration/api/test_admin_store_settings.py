"""Configuración de la tienda en el panel (05_API.md §9.12, `RN-58` a `RN-61`).

§9.2.14 declara una fila única: los tests no crean ni eliminan configuraciones,
sino que trabajan sobre esa fila y restauran su estado al terminar.
"""

import pytest
from sqlalchemy import text

from app.extensions import db
from app.models import StoreSetting

RUTA = "/api/v1/admin/store/settings"

# 01 §12.3, con las obligatorias de §12.1 (`{{items}}` y `{{total}}`) presentes.
MENSAJE = "Hola {{tienda}}!\n{{items}}\nTotal estimado: {{total}}"
ITEM = "{{numero}}) {{producto}} — {{cantidad}} x {{precio_unitario}}"

BASE = {
    "store_name": "Pablito Sports",
    "whatsapp_number": "+595981123456",
    "address": "Av. Mariscal López 1234, Asunción",
    "business_hours": "Lunes a sábado de 08:00 a 19:00",
    "social_links": {"instagram": "https://instagram.com/pablitosports"},
    "message_template": MENSAJE,
    "item_template": ITEM,
    "featured_products_count": 8,
}

# §10.x (v1.1.0): el DTO de panel suma el correo y el contenido institucional.
# `StoreSettingsPublicDTO` **no** cambia: sigue en sus cinco campos (`AD-12`).
CAMPOS_DTO = {
    "store_name",
    "whatsapp_number",
    "email",
    "address",
    "business_hours",
    "social_links",
    "about_title",
    "about_text",
    "about_image_url",
    "message_template",
    "item_template",
    "featured_products_count",
}


def _payload(**overrides) -> dict:
    datos = dict(BASE)
    for clave, valor in overrides.items():
        if valor is _AUSENTE:
            datos.pop(clave, None)
        else:
            datos[clave] = valor
    return datos


class _Ausente:
    """Marca para quitar una clave del payload, distinta de `None`."""


_AUSENTE = _Ausente()


def _sobre(respuesta):
    assert respuesta.status_code == 200, respuesta.get_json()
    cuerpo = respuesta.get_json()
    assert cuerpo["success"] is True
    return cuerpo["data"]


@pytest.fixture
def configuracion(schema_app):
    """Deja la fila única en un estado conocido y **restaura la anterior**.

    §9.2.14 declara una fila única y compartida. Vaciar la tabla al terminar
    dejaba sin configuración a los módulos que corren después y que dependen
    del catálogo de sesión: las pruebas pasaban o fallaban según el orden. Se
    guarda lo que hubiera y se repone al salir.
    """

    def limpiar():
        with schema_app.app_context():
            db.session.execute(text("DELETE FROM audit_logs WHERE entity_type = 'store_settings'"))
            db.session.execute(text("DELETE FROM store_settings"))
            db.session.commit()

    with schema_app.app_context():
        previa = (
            db.session.execute(
                text(
                    "SELECT store_name, whatsapp_number, address, business_hours, social_links, "
                    "message_template, item_template, featured_products_count "
                    "FROM store_settings WHERE id = 1"
                )
            )
            .mappings()
            .one_or_none()
        )
        previa = dict(previa) if previa else None

    limpiar()
    with schema_app.app_context():
        db.session.add(StoreSetting(id=1, **BASE))
        db.session.commit()

    yield

    limpiar()
    if previa is not None:
        with schema_app.app_context():
            db.session.add(StoreSetting(id=1, **previa))
            db.session.commit()


@pytest.fixture
def cliente(admin_client, configuracion):
    return admin_client


# Contrato y permisos


def test_ambas_rutas_exigen_sesion(schema_app, configuracion):
    """PA-06: la autorización la impone el backend, no el panel."""
    client = schema_app.test_client()

    assert client.get(RUTA).status_code == 401
    assert client.put(RUTA, json=_payload()).status_code == 401


def test_lectura_devuelve_el_dto_del_contrato(cliente):
    """§10.x `StoreSettingsAdminDTO`: campos exactos, sin `updated_at`."""
    datos = _sobre(cliente.get(RUTA))

    assert set(datos) == CAMPOS_DTO
    assert datos["store_name"] == BASE["store_name"]
    assert datos["featured_products_count"] == 8


def test_lectura_sin_configuracion_inicializada_es_404(schema_app, admin_client):
    """§7.1 y §9.12: sin fila, el recurso no existe; no se inventa una."""
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM audit_logs WHERE entity_type = 'store_settings'"))
        db.session.execute(text("DELETE FROM store_settings"))
        db.session.commit()

    assert admin_client.get(RUTA).status_code == 404


def test_guardado_devuelve_el_dto_actualizado(cliente):
    datos = _sobre(cliente.put(RUTA, json=_payload(store_name="Pablito Sports Central")))

    assert set(datos) == CAMPOS_DTO
    assert datos["store_name"] == "Pablito Sports Central"


def test_guardado_persiste(cliente):
    cliente.put(RUTA, json=_payload(whatsapp_number="+595971000111"))

    assert _sobre(cliente.get(RUTA))["whatsapp_number"] == "+595971000111"


def test_put_reemplaza_el_recurso_completo(cliente):
    """`PUT` no es un parche: un opcional ausente queda en `NULL`."""
    cliente.put(RUTA, json=_payload(address=_AUSENTE, business_hours=_AUSENTE))

    datos = _sobre(cliente.get(RUTA))
    assert datos["address"] is None
    assert datos["business_hours"] is None


def test_redes_vacias_se_guardan_como_ausencia(cliente):
    """Un objeto sin claves útiles es `NULL`, no `{}`."""
    cliente.put(RUTA, json=_payload(social_links={"instagram": "  "}))

    assert _sobre(cliente.get(RUTA))["social_links"] is None


def test_guardado_deja_registro_de_auditoria(cliente, schema_app):
    """`AD-20`, `CONS-05`: la escritura y su registro caen o persisten juntos."""
    cliente.put(RUTA, json=_payload(store_name="Auditada"))

    with schema_app.app_context():
        fila = db.session.execute(
            text(
                "SELECT action, entity_id, old_values, new_values FROM audit_logs "
                "WHERE entity_type = 'store_settings' ORDER BY id DESC LIMIT 1"
            )
        ).one()

    assert fila.action == "update"
    assert fila.entity_id == 1
    assert fila.old_values["store_name"] == BASE["store_name"]
    assert fila.new_values["store_name"] == "Auditada"


# Validación de entrada (§11: 422)


@pytest.mark.parametrize(
    "overrides",
    [
        pytest.param({"store_name": _AUSENTE}, id="sin nombre"),
        pytest.param({"store_name": "   "}, id="nombre en blanco"),
        pytest.param({"store_name": "x" * 256}, id="nombre demasiado largo"),
        pytest.param({"whatsapp_number": _AUSENTE}, id="sin whatsapp"),
        pytest.param({"whatsapp_number": "x" * 51}, id="whatsapp demasiado largo"),
        pytest.param({"message_template": _AUSENTE}, id="sin plantilla de mensaje"),
        pytest.param({"item_template": _AUSENTE}, id="sin plantilla de item"),
        pytest.param({"featured_products_count": _AUSENTE}, id="sin destacados"),
        pytest.param({"featured_products_count": 0}, id="destacados en cero"),
        pytest.param({"featured_products_count": -1}, id="destacados negativos"),
        pytest.param({"featured_products_count": "ocho"}, id="destacados no numericos"),
        pytest.param({"social_links": "instagram"}, id="redes que no son objeto"),
    ],
)
def test_entrada_invalida_es_422(cliente, overrides):
    assert cliente.put(RUTA, json=_payload(**overrides)).status_code == 422


@pytest.mark.parametrize("variable", ["items", "total"])
def test_plantilla_sin_variable_obligatoria_es_422(cliente, variable):
    """`RN-60`: las obligatorias de §12.1 se validan antes de guardar."""
    incompleta = MENSAJE.replace(f"{{{{{variable}}}}}", "")

    respuesta = cliente.put(RUTA, json=_payload(message_template=incompleta))

    assert respuesta.status_code == 422
    campos = [error["field"] for error in respuesta.get_json()["errors"]]
    assert "message_template" in campos


def test_plantilla_de_item_no_exige_variables(cliente):
    """§12.2 no declara ninguna obligatoria: no se inventa la regla."""
    respuesta = cliente.put(RUTA, json=_payload(item_template="- un ítem"))

    assert respuesta.status_code == 200


def test_entrada_invalida_no_modifica_la_fila(cliente):
    """El rechazo es total: `422` no deja escrituras parciales."""
    cliente.put(RUTA, json=_payload(store_name="Nombre nuevo", featured_products_count=0))

    assert _sobre(cliente.get(RUTA))["store_name"] == BASE["store_name"]
