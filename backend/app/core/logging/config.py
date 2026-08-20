"""Structured logging (10_BACKEND.md §16, DPL-06).

Logs are emitted as one JSON object per line to stdout. Key-value pairs, never
assembled strings, so records can be filtered without parsing text
(02_ARQUITECTURA.md §9.13). CFG-05: no secret, password, token or credential is
ever written here.
"""

import json
import logging
import sys
import time
from datetime import UTC, datetime

from flask import Flask, g, request

from .request_context import get_request_id

# Attributes LogRecord always carries; anything else was supplied via `extra`.
_RESERVED_RECORD_ATTRS = frozenset(logging.LogRecord("", 0, "", 0, "", None, None).__dict__) | {
    "message",
    "asctime",
    "taskName",
}

# 03_SEGURIDAD.md §16.3 / §18.3: never serialise these, whatever the caller passes.
_FORBIDDEN_KEYS = frozenset(
    {
        "password",
        "password_hash",
        "secret",
        "secret_key",
        "token",
        "csrf_token",
        "authorization",
        "cookie",
    }
)


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

        extra = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _RESERVED_RECORD_ATTRS and key not in _FORBIDDEN_KEYS
        }
        extra.pop("request_id", None)
        extra.pop("user_id", None)
        if extra:
            payload["extra"] = extra

        if record.exc_info:
            # Stays server-side only; ERR-04 keeps it out of the response body.
            payload["exception"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


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
