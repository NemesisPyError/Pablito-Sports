"""Ningún secreto llega a los logs (03_SEGURIDAD.md §16.3, CFG-05).

Lo que estos tests demuestran no es que la salida tenga un formato concreto,
sino algo más simple y más fuerte: **el secreto no aparece en la línea escrita**.
Por eso casi todas las comprobaciones son `SECRETO not in salida`: si mañana
cambia el marcador de redacción o la forma del JSON, el test sigue valiendo.

La regresión que fijan: la implementación anterior filtraba las claves
prohibidas **solo en el nivel superior** del `LogRecord`. Una estructura anidada
—que es la forma normal de registrar un contexto— pasaba entera. Reproducido
antes de corregirlo.
"""

import json
import logging
import sys

import pytest

from app.core.logging.config import JsonFormatter
from app.core.logging.redaction import REDACTED, is_sensitive_key, redact

SECRETO = "no-debe-aparecer-jamas-en-un-log"


def _linea(**extra) -> str:
    """Formatea un registro real con el formateador de producción."""
    record = logging.LogRecord("app.test", logging.INFO, "archivo.py", 1, "algo pasó", None, None)
    for clave, valor in extra.items():
        setattr(record, clave, valor)
    return JsonFormatter().format(record)


# ---------------------------------------------------------------------------
# 1-4. Los cuatro tipos de secreto, directos
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "clave",
    [
        "password",
        "new_password",
        "current_password",
        "contrasena",
        "token",
        "access_token",
        "refresh_token",
        "csrf_token",
        "authorization",
        "Authorization",
        "cookie",
        "Set-Cookie",
        "session",
        "session_id",
        "secret",
        "secret_key",
        "api_key",
        "private_key",
        "credential",
    ],
)
def test_una_clave_sensible_en_el_nivel_superior_no_se_escribe(clave):
    assert SECRETO not in _linea(**{clave: SECRETO})


def test_el_nombre_de_la_clave_se_compara_sin_distinguir_forma():
    """X-CSRF-Token, X_Csrf_Token y x_csrf_token son la misma cosa."""
    for variante in ("X-CSRF-Token", "X_Csrf_Token", "x_csrf_token"):
        assert is_sensitive_key(variante), variante


# ---------------------------------------------------------------------------
# 5. Estructuras anidadas — la regresión concreta
# ---------------------------------------------------------------------------


def test_un_secreto_un_nivel_mas_abajo_tampoco_se_escribe():
    """Esto es lo que la implementación anterior dejaba pasar."""
    assert SECRETO not in _linea(payload={"username": "ana", "password": SECRETO})


def test_un_secreto_a_gran_profundidad_tampoco_se_escribe():
    profundo = {"a": {"b": {"c": {"d": {"e": {"authorization": SECRETO}}}}}}
    assert SECRETO not in _linea(ctx=profundo)


# ---------------------------------------------------------------------------
# 6. Listas
# ---------------------------------------------------------------------------


def test_una_lista_de_objetos_sensibles_no_se_escribe():
    assert SECRETO not in _linea(usuarios=[{"user": "ana"}, {"user": "leo", "token": SECRETO}])


def test_tambien_en_tuplas_y_listas_anidadas():
    assert SECRETO not in _linea(datos=({"cookie": SECRETO},))
    assert SECRETO not in _linea(datos=[[[{"secret": SECRETO}]]])


# ---------------------------------------------------------------------------
# 7. Mezclas
# ---------------------------------------------------------------------------


def test_una_estructura_mixta_queda_limpia_entera():
    mixta = {
        "request": {
            "headers": {"Authorization": "Bearer " + SECRETO, "Accept": "application/json"},
            "cookies": [{"name": "session", "session": SECRETO}],
        },
        "intentos": [
            {"usuario": "ana", "password": SECRETO},
            {"usuario": "leo", "password": SECRETO},
        ],
    }
    salida = _linea(ctx=mixta)

    assert SECRETO not in salida
    # Y no se perdió el contexto útil que acompañaba al secreto.
    assert "application/json" in salida
    assert "ana" in salida and "leo" in salida


def test_un_objeto_arbitrario_no_expone_sus_atributos():
    """El default=str anterior escribía el repr, que lleva los atributos."""

    class Credencial:
        def __init__(self):
            self.valor = SECRETO

        def __repr__(self):
            return "Credencial(valor=" + repr(self.valor) + ")"

    assert SECRETO not in _linea(obj=Credencial())


def test_los_bytes_no_se_vuelcan():
    """Una cookie o un cuerpo crudo: solo interesa el tamaño."""
    assert SECRETO not in _linea(cuerpo=SECRETO.encode())


# ---------------------------------------------------------------------------
# 8. Lo normal se conserva — la redacción no puede vaciar el log
# ---------------------------------------------------------------------------


def test_los_valores_normales_siguen_estando():
    salida = _linea(
        method="POST", path="/api/v1/admin/users", status=422, duration_ms=12.5, ip="10.0.0.7"
    )
    payload = json.loads(salida)

    assert payload["extra"]["method"] == "POST"
    assert payload["extra"]["path"] == "/api/v1/admin/users"
    assert payload["extra"]["status"] == 422
    assert payload["extra"]["duration_ms"] == 12.5
    assert payload["extra"]["ip"] == "10.0.0.7"


def test_la_linea_sigue_siendo_json_valido_de_una_sola_linea():
    salida = _linea(ctx={"a": [1, 2, {"password": SECRETO}]})

    assert "\n" not in salida
    json.loads(salida)


def test_se_conserva_la_forma_para_que_se_note_que_hubo_redaccion():
    """Se sustituye el valor, no se borra la clave: el lector ve que pasó."""
    limpio = redact({"user": "ana", "password": SECRETO})

    assert limpio == {"user": "ana", "password": REDACTED}


def test_una_clave_parecida_pero_inocente_no_se_redacta():
    """author no es authorization; primary_key no es api_key."""
    limpio = redact({"author": "ana", "primary_key": 7, "keyword": "zapatilla"})

    assert limpio == {"author": "ana", "primary_key": 7, "keyword": "zapatilla"}


# ---------------------------------------------------------------------------
# 9. Excepciones
# ---------------------------------------------------------------------------


def test_una_excepcion_no_arrastra_el_extra_sensible():
    """El traceback se conserva —hace falta— pero el extra va redactado."""
    record = logging.LogRecord("app.errors", logging.ERROR, "a.py", 1, "falló", None, None)
    try:
        raise ValueError("algo se rompió")
    except ValueError:
        record.exc_info = sys.exc_info()
    record.payload = {"credenciales": {"password": SECRETO}}

    salida = JsonFormatter().format(record)
    payload = json.loads(salida)

    assert SECRETO not in salida
    # No se pierde el diagnóstico: el stacktrace sigue ahí (ERR-05).
    assert "ValueError" in payload["exception"]
    assert "algo se rompió" in payload["exception"]


# ---------------------------------------------------------------------------
# Estructuras hostiles: la redacción no puede colgar ni reventar el log
# ---------------------------------------------------------------------------


def test_una_estructura_circular_no_cuelga():
    ciclo = {"nombre": "raiz"}
    ciclo["yo"] = ciclo

    json.loads(_linea(ctx=ciclo))


def test_una_estructura_desmedida_se_corta():
    profundo = actual = {}
    for _ in range(200):
        actual["siguiente"] = {}
        actual = actual["siguiente"]
    actual["password"] = SECRETO

    salida = _linea(ctx=profundo)

    assert SECRETO not in salida
    json.loads(salida)
