"""Plantilla de WhatsApp en el panel (05_API.md §9.13, `RN-59` a `RN-61`).

§9.13 expone las mismas columnas que §9.12. Los tests comprueban además que las
dos puertas ven el mismo dato: si divergieran, el catálogo recibiría una
plantilla distinta de la que el administrador cree haber guardado.
"""

import pytest
from sqlalchemy import text

from app.core.utils.whatsapp_defaults import DEFAULT_ITEM_TEMPLATE, DEFAULT_MESSAGE_TEMPLATE
from app.extensions import db
from app.models import StoreSetting

RUTA = "/api/v1/admin/store/whatsapp-template"
RUTA_RESET = f"{RUTA}/reset"
RUTA_SETTINGS = "/api/v1/admin/store/settings"

MENSAJE = "Hola {{tienda}}!\n{{items}}\nTotal estimado: {{total}}"
ITEM = "{{numero}}) {{producto}} — {{cantidad}} x {{precio_unitario}}"

BASE = {
    "store_name": "Pablito Sports",
    "whatsapp_number": "+595981123456",
    "address": None,
    "business_hours": None,
    "social_links": None,
    "message_template": MENSAJE,
    "item_template": ITEM,
    "featured_products_count": 8,
}

CAMPOS_DTO = {"message_template", "item_template"}


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


def test_todas_las_rutas_exigen_sesion(schema_app, configuracion):
    """PA-06."""
    client = schema_app.test_client()

    assert client.get(RUTA).status_code == 401
    assert client.put(RUTA, json={}).status_code == 401
    assert client.post(RUTA_RESET).status_code == 401


def test_lectura_devuelve_el_dto_del_contrato(cliente):
    """§10.x `WhatsAppTemplateDTO`: exactamente las dos plantillas."""
    datos = _sobre(cliente.get(RUTA))

    assert set(datos) == CAMPOS_DTO
    assert datos["message_template"] == MENSAJE
    assert datos["item_template"] == ITEM


def test_lectura_sin_configuracion_inicializada_es_404(schema_app, admin_client):
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM audit_logs WHERE entity_type = 'store_settings'"))
        db.session.execute(text("DELETE FROM store_settings"))
        db.session.commit()

    assert admin_client.get(RUTA).status_code == 404


def test_guardado_devuelve_y_persiste(cliente):
    nuevo = "Buenas! {{items}} — total {{total}}"

    datos = _sobre(cliente.put(RUTA, json={"message_template": nuevo, "item_template": ITEM}))

    assert set(datos) == CAMPOS_DTO
    assert datos["message_template"] == nuevo
    assert _sobre(cliente.get(RUTA))["message_template"] == nuevo


def test_guardado_no_toca_el_resto_de_la_configuracion(cliente):
    """§9.13 es un recurso acotado: no puede borrar el nombre ni el número."""
    cliente.put(RUTA, json={"message_template": MENSAJE, "item_template": "otro {{producto}}"})

    configuracion = _sobre(cliente.get(RUTA_SETTINGS))
    assert configuracion["store_name"] == BASE["store_name"]
    assert configuracion["whatsapp_number"] == BASE["whatsapp_number"]
    assert configuracion["featured_products_count"] == 8


def test_las_dos_puertas_ven_el_mismo_dato(cliente):
    """§9.12 y §9.13 son la misma columna: no pueden discrepar."""
    nuevo = "Consulta: {{items}} / {{total}}"
    cliente.put(RUTA, json={"message_template": nuevo, "item_template": ITEM})

    assert _sobre(cliente.get(RUTA_SETTINGS))["message_template"] == nuevo


def test_lo_guardado_por_settings_se_ve_en_la_plantilla(cliente):
    """Y en el sentido inverso."""
    nuevo = "Desde settings {{items}} {{total}}"
    cliente.put(RUTA_SETTINGS, json={**BASE, "message_template": nuevo})

    assert _sobre(cliente.get(RUTA))["message_template"] == nuevo


def test_guardado_deja_registro_de_auditoria(cliente, schema_app):
    """`AD-20`, `CONS-05`."""
    cliente.put(
        RUTA, json={"message_template": "Auditada {{items}} {{total}}", "item_template": ITEM}
    )

    with schema_app.app_context():
        fila = db.session.execute(
            text(
                "SELECT action, entity_id, old_values, new_values FROM audit_logs "
                "WHERE entity_type = 'store_settings' ORDER BY id DESC LIMIT 1"
            )
        ).one()

    assert fila.action == "update"
    assert fila.entity_id == 1
    assert fila.old_values["message_template"] == MENSAJE
    assert "Auditada" in fila.new_values["message_template"]


# Restauración (`RN-61`)


def test_reset_restaura_la_plantilla_por_defecto(cliente):
    """`RN-61`: la plantilla por defecto es restaurable en cualquier momento."""
    datos = _sobre(cliente.post(RUTA_RESET))

    assert datos["message_template"] == DEFAULT_MESSAGE_TEMPLATE
    assert datos["item_template"] == DEFAULT_ITEM_TEMPLATE


def test_reset_persiste(cliente):
    cliente.post(RUTA_RESET)

    assert _sobre(cliente.get(RUTA))["message_template"] == DEFAULT_MESSAGE_TEMPLATE


def test_la_plantilla_por_defecto_cumple_RN_60(cliente):
    """Restaurar no puede dejar la tienda en un estado que el PUT rechazaría."""
    restaurada = _sobre(cliente.post(RUTA_RESET))

    respuesta = cliente.put(RUTA, json=restaurada)

    assert respuesta.status_code == 200


def test_reset_no_toca_el_resto_de_la_configuracion(cliente):
    cliente.post(RUTA_RESET)

    assert _sobre(cliente.get(RUTA_SETTINGS))["store_name"] == BASE["store_name"]


def test_reset_deja_registro_de_auditoria(cliente, schema_app):
    """Restaurar es una escritura: el historial debe mostrar qué había antes."""
    cliente.post(RUTA_RESET)

    with schema_app.app_context():
        fila = db.session.execute(
            text(
                "SELECT action, old_values, new_values FROM audit_logs "
                "WHERE entity_type = 'store_settings' ORDER BY id DESC LIMIT 1"
            )
        ).one()

    assert fila.action == "update"
    assert fila.old_values["message_template"] == MENSAJE
    assert fila.new_values["message_template"] == DEFAULT_MESSAGE_TEMPLATE


# Validación de entrada (§11: 422)


@pytest.mark.parametrize(
    "payload",
    [
        pytest.param({"item_template": ITEM}, id="sin plantilla de mensaje"),
        pytest.param({"message_template": MENSAJE}, id="sin plantilla de item"),
        pytest.param({"message_template": "   ", "item_template": ITEM}, id="mensaje en blanco"),
        pytest.param({"message_template": MENSAJE, "item_template": "  "}, id="item en blanco"),
        pytest.param({"message_template": 42, "item_template": ITEM}, id="mensaje no es texto"),
    ],
)
def test_entrada_invalida_es_422(cliente, payload):
    assert cliente.put(RUTA, json=payload).status_code == 422


@pytest.mark.parametrize("variable", ["items", "total"])
def test_falta_una_variable_obligatoria_es_422(cliente, variable):
    """`RN-60`, `RF-41`: se validan las obligatorias de §12.1 antes de guardar."""
    incompleta = MENSAJE.replace(f"{{{{{variable}}}}}", "")

    respuesta = cliente.put(RUTA, json={"message_template": incompleta, "item_template": ITEM})

    assert respuesta.status_code == 422
    campos = [error["field"] for error in respuesta.get_json()["errors"]]
    assert "message_template" in campos


def test_la_plantilla_de_item_no_exige_variables(cliente):
    """§12.2 no declara ninguna obligatoria."""
    respuesta = cliente.put(RUTA, json={"message_template": MENSAJE, "item_template": "- un ítem"})

    assert respuesta.status_code == 200


def test_entrada_invalida_no_modifica_la_fila(cliente):
    cliente.put(RUTA, json={"message_template": "sin variables", "item_template": "otro"})

    assert _sobre(cliente.get(RUTA))["message_template"] == MENSAJE
