"""Los logs de una petición real no contienen secretos (S-10, §16.3).

`tests/unit/core/test_log_redaction.py` cubre el formateador en aislamiento.
Acá se comprueba el camino completo, que es donde estaba el agujero que no se
podía tapar con redacción por nombre de clave: **el traceback**.

`handle_unexpected_exception` registra el stacktrace (ERR-05, y hace falta). Un
error de base de datos vuelca valores de fila dentro del mensaje de su
excepción, por DOS vías distintas, y hicieron falta dos correcciones:

  1. `[parameters: (...)]`, que agrega SQLAlchemy -> `hide_parameters=True` en
     el motor (config/base.py).
  2. `DETAIL:  Failing row contains (...)`, que agrega **PostgreSQL**, con la
     fila COMPLETA. `hide_parameters` no lo toca porque no lo genera SQLAlchemy;
     lo recorta `redact_text` en el formateador.

La segunda apareció justamente al escribir estos tests: la primera corrección
sola dejaba el `password_hash` en el log.
"""

import io
import json
import logging

import pytest
from sqlalchemy.exc import IntegrityError

from app.core.logging.config import JsonFormatter
from app.core.security.password import hash_password
from app.extensions import db
from app.models import Administrator

HASH_MARCADO = "$2b$12$MARCA-QUE-NO-DEBE-APARECER-EN-NINGUN-LOG"


@pytest.fixture
def logs():
    """Captura todo lo que la aplicación escriba, con el formateador real."""
    buffer = io.StringIO()
    handler = logging.StreamHandler(buffer)
    handler.setFormatter(JsonFormatter())

    raiz = logging.getLogger()
    previos, nivel = raiz.handlers, raiz.level
    raiz.handlers, raiz.level = [handler], logging.DEBUG
    try:
        yield buffer
    finally:
        raiz.handlers, raiz.level = previos, nivel


def test_un_error_de_base_de_datos_no_escribe_los_valores_de_la_fila(app, logs):
    """El vector real: `[parameters: ...]` dentro del mensaje de la excepción."""
    with app.app_context():
        duplicado = "s10-duplicado"
        db.session.add(
            Administrator(
                username=duplicado,
                email="s10-a@pablitosports.test",
                password_hash=HASH_MARCADO,
                role="administrator",
            )
        )
        db.session.add(
            Administrator(
                username=duplicado,
                email="s10-b@pablitosports.test",
                password_hash=HASH_MARCADO,
                role="administrator",
            )
        )
        try:
            db.session.commit()
        except IntegrityError:
            logging.getLogger("app.errors").exception(
                "unhandled exception", extra={"error_type": "IntegrityError"}
            )
        else:
            pytest.fail("se esperaba una violación de unicidad")
        finally:
            db.session.rollback()

    salida = logs.getvalue()

    assert salida, "el error tenía que quedar registrado"
    assert HASH_MARCADO not in salida
    # No se sacrificó el diagnóstico: el traceback y el tipo de error siguen.
    assert "IntegrityError" in salida


def test_el_volcado_de_fila_de_postgresql_tampoco_escribe_el_hash(app, logs):
    """La segunda vía: `DETAIL:  Failing row contains (...)`.

    Una violación de NOT NULL hace que PostgreSQL devuelva la fila entera en el
    `DETAIL` de su error. Con un hash **generado de verdad**, no una marca de
    texto, para que el test no dependa de un valor reconocible.
    """
    with app.app_context():
        hash_real = hash_password("una-contrasena-larga-de-prueba")
        # Sin `role`, que es NOT NULL: es la violación que dispara el volcado.
        db.session.add(
            Administrator(
                username="s10-hash", email="s10-h@pablitosports.test", password_hash=hash_real
            )
        )
        try:
            db.session.commit()
        except IntegrityError:
            logging.getLogger("app.errors").exception("unhandled exception")
        else:
            pytest.fail("se esperaba una violación de NOT NULL")
        finally:
            db.session.rollback()

    salida = logs.getvalue()

    assert salida, "el error tenía que quedar registrado"
    assert hash_real not in salida
    # Se conserva qué falló, que es lo que sirve para diagnosticarlo.
    assert "IntegrityError" in salida


# ---------------------------------------------------------------------------
# Registro de peticiones: qué se escribe y qué no
# ---------------------------------------------------------------------------


def _registros_de_peticion(buffer) -> list[dict]:
    salida = []
    for linea in buffer.getvalue().splitlines():
        if not linea.strip():
            continue
        registro = json.loads(linea)
        if registro.get("logger") == "app.request":
            salida.append(registro)
    return salida


def test_el_login_fallido_queda_registrado_sin_la_contrasena(client, logs):
    """No se pierde el registro de seguridad; se pierde solo el secreto."""
    respuesta = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "inexistente", "password": "contrasena-secreta-del-test"},
    )

    salida = logs.getvalue()
    assert respuesta.status_code in (401, 422)
    assert "contrasena-secreta-del-test" not in salida
    # El intento SÍ debe constar: es el registro que sirve para investigar abuso.
    assert _registros_de_peticion(logs), "la petición tenía que quedar registrada"


def test_el_query_string_no_se_registra(client, logs):
    """Preferido a redactarlo: lo que no se escribe no se puede filtrar.

    Si mañana alguien pasa `?token=...`, no hay nada que sanear porque el
    registro guarda `request.path`, que excluye la parte de consulta.
    """
    client.get("/api/v1/brands?token=secreto-en-la-url&password=otro-secreto")

    salida = logs.getvalue()
    assert "secreto-en-la-url" not in salida
    assert "otro-secreto" not in salida

    registros = _registros_de_peticion(logs)
    assert registros
    assert registros[0]["extra"]["path"] == "/api/v1/brands"


def test_ni_las_cabeceras_ni_las_cookies_se_registran(client, logs):
    client.get(
        "/api/v1/brands",
        headers={
            "Authorization": "Bearer valor-de-authorization",
            "Cookie": "session=valor-de-cookie",
        },
    )

    salida = logs.getvalue()
    assert "valor-de-authorization" not in salida
    assert "valor-de-cookie" not in salida


def test_el_registro_conserva_lo_que_hace_falta_para_operar(client, logs):
    """Método, ruta, estado, duración e IP: ni más, ni menos."""
    client.get("/api/v1/brands")

    registro = _registros_de_peticion(logs)[0]
    extra = registro["extra"]

    assert extra["method"] == "GET"
    assert extra["status"] == 200
    assert extra["duration_ms"] is not None
    assert "ip" in extra
    # Y nada de lo que podría llevar un secreto.
    for prohibido in ("headers", "cookies", "body", "query_string", "full_path"):
        assert prohibido not in extra
