"""Structured logging (10_BACKEND.md §16, DPL-06).

Logs are emitted as one JSON object per line to stdout. Key-value pairs, never
assembled strings, so records can be filtered without parsing text
(02_ARQUITECTURA.md §9.13). CFG-05: no secret, password, token or credential is
ever written here — ver `redaction.py`, que aplica esa garantía de forma
recursiva sobre todo lo que llega por `extra`.
"""

import json
import logging
import sys
import time
from datetime import UTC, datetime

from flask import Flask, g, request

from .redaction import redact, redact_text
from .request_context import get_request_id

# Attributes LogRecord always carries; anything else was supplied via `extra`.
_RESERVED_RECORD_ATTRS = frozenset(logging.LogRecord("", 0, "", 0, "", None, None).__dict__) | {
    "message",
    "asctime",
    "taskName",
}

# 03_SEGURIDAD.md §16.3 / §18.3: lo sensible no se serializa, lo pase quien lo
# pase. El criterio y el recorrido recursivo viven en `redaction.py`; acá no se
# repite la lista, para que no se desincronicen dos copias.


class JsonFormatter(logging.Formatter):
    """Renders a log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", None) or _safe_request_id(),
            "user_id": getattr(record, "user_id", None),
        }

        crudo = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _RESERVED_RECORD_ATTRS
        }
        crudo.pop("request_id", None)
        crudo.pop("user_id", None)
        # Recursivo: la clave sensible puede estar a cualquier profundidad, y
        # `redact` deja además todo serializable sin necesidad de `default=`.
        extra = redact(crudo)
        if extra:
            payload["extra"] = extra

        if record.exc_info:
            # Solo del lado del servidor; ERR-04 lo mantiene fuera del cuerpo de
            # la respuesta. El traceback NO se puede redactar por nombre de
            # clave —es texto libre—: lo que se hace es cortar la fuente, con
            # `hide_parameters` en el motor de SQLAlchemy (config/base.py), que
            # es donde aparecían valores de fila (`password_hash` incluido).
            # `redact_text` es la segunda barrera: recorta además el
            # `DETAIL: Failing row contains (...)` que emite PostgreSQL, que
            # `hide_parameters` no alcanza porque lo genera el servidor.
            payload["exception"] = redact_text(self.formatException(record.exc_info))

        return json.dumps(payload, ensure_ascii=False)


def _safe_request_id() -> str | None:
    """Reads the correlation id when a request context exists."""
    try:
        return get_request_id()
    except RuntimeError:
        return None


def init_app(app: Flask) -> None:
    """Configures the root logger and the request access log."""
    level = getattr(logging, str(app.config.get("LOG_LEVEL", "INFO")).upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())

    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)

    app.logger.handlers = []
    app.logger.propagate = True
    app.logger.setLevel(level)

    for name in ("gunicorn.error", "gunicorn.access", "werkzeug"):
        external = logging.getLogger(name)
        external.handlers = [handler]
        external.propagate = False

    _register_request_logging(app)


def _register_request_logging(app: Flask) -> None:
    """Logs one record per request (10_BACKEND.md §11, order 3).

    ERR-05: 5xx at error level, 4xx at info level.
    """

    # Campos elegidos, y por qué NO están los demás (auditado en S-10):
    #
    #   · `path` y NO `full_path`: `request.path` excluye el query string. Un
    #     `?token=...` o `?password=...` no llega al log porque el query string
    #     no se registra en absoluto. Preferido a redactarlo: lo que no se
    #     escribe no se puede filtrar.
    #   · sin cabeceras, sin cookies, sin cuerpo: ahí viven `Authorization`,
    #     `Cookie`, el token CSRF y las contraseñas de los formularios. Ninguno
    #     hace falta para operar.
    #   · `ip` SÍ: es lo que permite investigar un abuso y correlacionar con el
    #     rate limiting (§14). Es el único dato personal del registro.
    #   · sin `user-agent`: no se usa para nada operativo.
    @app.after_request
    def _log_request(response):
        started_at = getattr(g, "request_started_at", None)
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2) if started_at else None

        if response.status_code >= 500:
            level = logging.ERROR
        elif response.status_code >= 400:
            level = logging.INFO
        else:
            level = logging.INFO

        logging.getLogger("app.request").log(
            level,
            "request completed",
            extra={
                "method": request.method,
                "path": request.path,
                "status": response.status_code,
                "duration_ms": duration_ms,
                "ip": request.remote_addr,
            },
        )
        return response
