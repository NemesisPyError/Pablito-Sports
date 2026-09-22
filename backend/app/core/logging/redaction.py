"""Redacción de datos sensibles antes de escribirlos en un log (S-10).

03_SEGURIDAD.md §16.3 y CFG-05: ninguna contraseña, token, cookie, cabecera de
autorización ni secreto puede aparecer en un registro.

**Por qué una función recursiva y no un filtro de claves.** La versión anterior
descartaba las claves prohibidas del nivel superior del `LogRecord`. Comprobado
antes de reescribirlo: eso deja pasar exactamente lo que más probable es que
alguien registre —una estructura entera—. Con la implementación anterior::

    extra={"password": "..."}                       -> se descartaba  ✔
    extra={"payload": {"password": "..."}}          -> SE ESCRIBÍA    ✘
    extra={"usuarios": [{"token": "..."}]}          -> SE ESCRIBÍA    ✘
    extra={"ctx": {"req": {"headers": {...}}}}      -> SE ESCRIBÍA    ✘

Acá se recorre la estructura completa: diccionarios, listas, tuplas y conjuntos,
a cualquier profundidad.

**El criterio es por nombre de clave, no por valor.** Un valor no se puede
reconocer como secreto mirándolo; el nombre que le puso quien lo registró sí.
La comparación es por **subcadena** y sin distinguir mayúsculas, para que
`new_password`, `current_password`, `access_token`, `refresh_token`,
`X-CSRF-Token` o `Set-Cookie` queden cubiertos sin enumerarlos uno por uno.

**Sesga hacia redactar de más.** `session_timeout` se redacta aunque sea un
número inofensivo. Perder un dato de diagnóstico es reversible; publicar un
secreto en un log que se archiva, no.
"""

import datetime
import decimal
import enum
import pathlib
import re
import uuid

REDACTED = "[redacted]"

# Subcadenas que marcan una clave como sensible. Se eligen inequívocas a
# propósito: `auth` a secas casaría con `author` y `authenticated`, y `key` con
# `primary_key`, así que se usan las formas largas.
SENSITIVE_KEY_FRAGMENTS = (
    "password",
    "passwd",
    "contrasena",
    "contraseña",
    "secret",
    "token",
    "authorization",
    "cookie",
    "session",
    "credential",
    "credencial",
    "api_key",
    "apikey",
    "private_key",
    "csrf",
)

# Tipos cuyo `str()` es su propio valor y no puede arrastrar estado oculto.
# Cualquier otro objeto desconocido se sustituye por su clase: el `repr` de un
# objeto arbitrario puede contener sus atributos, y ahí es donde se colaba un
# secreto con el `default=str` anterior.
_SAFE_STR_TYPES = (
    datetime.datetime,
    datetime.date,
    datetime.time,
    datetime.timedelta,
    decimal.Decimal,
    uuid.UUID,
    pathlib.PurePath,
)

# Tope de profundidad: una estructura cíclica o desmedida no debe colgar al
# formateador de logs ni producir una línea inmanejable.
_MAX_DEPTH = 12


def is_sensitive_key(key) -> bool:
    """La clave nombra algo que no puede escribirse en un log."""
    if not isinstance(key, str):
        return False
    normalizada = key.replace("-", "_").lower()
    return any(fragmento in normalizada for fragmento in SENSITIVE_KEY_FRAGMENTS)


def redact(value, *, _depth: int = 0, _seen: frozenset = frozenset()):
    """Devuelve una copia de `value` con todo lo sensible sustituido.

    Recorre diccionarios, listas, tuplas y conjuntos a cualquier profundidad. Lo
    que no es una estructura se normaliza a algo serializable en JSON.
    """
    if _depth > _MAX_DEPTH:
        return "[too deep]"

    if isinstance(value, dict):
        if id(value) in _seen:
            return "[circular]"
        vistos = _seen | {id(value)}
        return {
            str(clave): (
                REDACTED
                if is_sensitive_key(clave)
                else redact(interior, _depth=_depth + 1, _seen=vistos)
            )
            for clave, interior in value.items()
        }

    if isinstance(value, list | tuple | set | frozenset):
        if id(value) in _seen:
            return "[circular]"
        vistos = _seen | {id(value)}
        return [redact(interior, _depth=_depth + 1, _seen=vistos) for interior in value]

    return _scalar(value)


def _scalar(value):
    """Normaliza un valor suelto a algo que `json.dumps` acepte sin `default`."""
    if value is None or isinstance(value, str | bool | int | float):
        return value
    if isinstance(value, enum.Enum):
        return _scalar(value.value)
    if isinstance(value, bytes | bytearray):
        # El contenido puede ser cualquier cosa —una cookie, un cuerpo—: solo el
        # tamaño es informativo y no arrastra nada.
        return f"<{type(value).__name__} de {len(value)} bytes>"
    if isinstance(value, _SAFE_STR_TYPES):
        return str(value)
    # Objeto arbitrario: su `repr` puede exponer atributos. Solo la clase.
    return f"<{type(value).__name__}>"


# ---------------------------------------------------------------------------
# Texto libre: el traceback
# ---------------------------------------------------------------------------
#
# Un stacktrace NO se puede redactar por nombre de clave —no tiene claves—, y
# sigue haciendo falta registrarlo (ERR-05). Lo que sí se puede es cortar los
# **dos formatos conocidos** en los que un motor de base de datos vuelca valores
# de fila dentro del mensaje de su excepción. Ambos comprobados contra este
# proyecto antes de escribir esto:
#
#   1. SQLAlchemy: `[parameters: ('ana', '$2b$12$...')]`. Ya se corta en el
#      origen con `hide_parameters=True` (config/base.py); esto es la segunda
#      barrera por si alguien crea un motor sin esa opción.
#   2. PostgreSQL: `DETAIL:  Failing row contains (ana, a@b, $2b$12$..., ...)`.
#      Este lo emite el **servidor**, no SQLAlchemy, así que `hide_parameters`
#      no lo toca. Aparece en violaciones de NOT NULL y de CHECK, y trae la fila
#      COMPLETA: en `administrators` eso incluye el `password_hash`.
#
# Es reconocimiento por patrón, no por estructura: es explícitamente una defensa
# de segunda línea, no la garantía principal. La garantía principal es que
# ningún código de la aplicación pone secretos en mensajes de excepción
# (auditado) y que los valores no viajan en los parámetros.
#
# NO se recorta `DETAIL:  Key (username)=(ana) already exists.`: nombra solo la
# columna en conflicto —nunca la contraseña—, y es justo lo que hace falta para
# diagnosticar un choque de unicidad.

_PATRONES_DE_TEXTO = (
    # `[parameters: (...)]` / `[parameters: {...}]`, hasta el cierre de línea.
    re.compile(r"\[parameters:.*", re.IGNORECASE),
    # La fila completa que devuelve PostgreSQL, hasta el fin de línea.
    re.compile(r"(DETAIL:\s*Failing row contains).*", re.IGNORECASE),
)


def redact_text(texto: str) -> str:
    """Recorta de un texto libre los volcados de fila conocidos."""
    if not texto:
        return texto
    limpio = _PATRONES_DE_TEXTO[0].sub(f"[parameters {REDACTED}]", texto)
    # Se conserva el encabezado del `DETAIL` —dice qué clase de restricción
    # falló— y se recorta solo la fila.
    return _PATRONES_DE_TEXTO[1].sub(lambda m: m.group(1) + " " + REDACTED, limpio)
