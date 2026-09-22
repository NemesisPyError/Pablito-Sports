"""Global exception handlers (ERR-01, ERR-02, ERR-04, ERR-05).

This module defines the handler functions; `api/errors.py` registers them on the
application. No route catches exceptions on its own.
"""

import logging

from flask import Flask, g, has_app_context
from flask_wtf.csrf import CSRFError
from werkzeug.exceptions import HTTPException

from ...extensions import db
from ..logging.request_context import get_request_id, new_request_id
from ..utils.responses import error_response
from .base import AppException
from .validation import RequestValidationError

logger = logging.getLogger("app.errors")


def _ensure_request_id() -> None:
    """Garantiza `g.request_id` para errores que abortan antes del middleware.

    `CSRFProtect` valida el token en un `before_request` que se registra antes
    que el de `request_context` (orden del factory), de modo que un `403` de
    token puede llegar al handler sin identificador de correlación asignado.
    Aquí se genera uno de emergencia con el mismo formato (OA-09), para que
    `meta.request_id` nunca sea `null` y el `X-Request-Id` se pueda emitir.

    No altera el caso normal: si el middleware ya corrió, `get_request_id()`
    devuelve un valor y esto no hace nada.
    """
    if has_app_context() and get_request_id() is None:
        g.request_id = new_request_id()


def _discard_pending_writes() -> None:
    """Red de seguridad: ninguna petición fallida deja escrituras pendientes.

    `@transactional` ya hace rollback en el servicio (10_BACKEND.md §14.3). Esto
    cubre lo que muere fuera de esa frontera. Sin ello, `Flask-Session` —que
    comparte la sesión de la aplicación y hace `commit()` al guardar la sesión de
    usuario, ya en la fase de respuesta— confirmaría escrituras a medias de una
    petición que terminó en error.
    """
    if has_app_context() and db.session.registry.has():
        db.session.rollback()


# Codes and details published in 05_API.md §11.1, for failures raised by
# Flask/Werkzeug itself (routing, method matching, malformed body) rather than by
# the domain. The detail is fixed here instead of reusing the Werkzeug
# description, which is written for humans and varies between versions.
_HTTP_STATUS_ERRORS = {
    400: ("malformed_request", "request body is not valid JSON"),
    401: ("authentication_required", "session not found or expired"),
    403: ("insufficient_privileges", "operation not permitted for this role"),
    404: ("resource_not_found", "resource not found or not visible"),
    409: ("business_rule_violation", "business rule violated"),
    413: ("payload_too_large", "uploaded content exceeds the maximum size"),
    422: ("validation_error", "payload failed validation"),
    429: ("rate_limit_exceeded", "rate limit exceeded"),
    500: ("internal_server_error", "unexpected error occurred"),
    502: ("integration_error", "external service unavailable"),
}


def register_error_handlers(app: Flask) -> None:
    """Wires the global handlers. Most specific first."""
    app.register_error_handler(CSRFError, handle_csrf_error)
    app.register_error_handler(AppException, handle_app_exception)
    app.register_error_handler(HTTPException, handle_http_exception)
    app.register_error_handler(Exception, handle_unexpected_exception)


def handle_csrf_error(error: CSRFError):
    """03_SEGURIDAD.md §8: falta o no coincide el token CSRF.

    Flask-WTF lo modela como un 400, pero la petición está bien formada: lo que
    falta es la prueba de que la originó el panel. Se responde 403, coherente con
    §6.3, y con un código propio para que el frontend pueda pedir un token nuevo
    en vez de tratarlo como un error de sintaxis.
    """
    _discard_pending_writes()
    _ensure_request_id()
    _log(403, "csrf_token_invalid", "csrf token missing or invalid")
    return error_response(
        [
            {
                "code": "csrf_token_invalid",
                "rule": None,
                "detail": "csrf token missing or invalid",
                "field": None,
            }
        ],
        status_code=403,
    )


def handle_app_exception(error: AppException):
    """Translates a known domain exception into the AD-16 envelope."""
    _discard_pending_writes()
    errors = error.to_errors() if isinstance(error, RequestValidationError) else [error.to_error()]
    _log(error.status_code, error.code, error.detail)
    return error_response(errors, status_code=error.status_code)


def handle_http_exception(error: HTTPException):
    """Translates Werkzeug failures (404 routing, 405, malformed body) into AD-16."""
    _discard_pending_writes()
    status_code = error.code or 500
    # ERR-04: a fixed technical detail, never the exception's own message.
    code, detail = _HTTP_STATUS_ERRORS.get(
        status_code, (_slugify(error.name), _slugify(error.name).replace("_", " "))
    )

    _log(status_code, code, detail)
    return error_response(
        [{"code": code, "rule": None, "detail": detail, "field": None}],
        status_code=status_code,
    )


def handle_unexpected_exception(error: Exception):
    """Last resort: anything unforeseen becomes a 500 with no internals leaked.

    ERR-05: logged at error level with the full stacktrace and the correlation id.
    """
    _discard_pending_writes()
    # S-13: también acá. Un fallo que ocurre ANTES del middleware de
    # `request_context` —el `before_request` del rate limiter se registra antes,
    # ver el orden en `create_app`— llegaba con `meta.request_id: null`, y era
    # justo el caso en que la correlación más falta hace: reproducido dejando
    # Redis fuera de servicio, donde todo respondía 500 sin identificador.
    _ensure_request_id()
    logger.exception("unhandled exception", extra={"error_type": type(error).__name__})
    return error_response(
        [
            {
                "code": "internal_server_error",
                "rule": None,
                "detail": "unexpected error occurred",
                "field": None,
            }
        ],
        status_code=500,
    )


def _log(status_code: int, code: str, detail: str) -> None:
    """ERR-05: 5xx at error level, 4xx at info level."""
    level = logging.ERROR if status_code >= 500 else logging.INFO
    logger.log(
        level,
        "request failed",
        extra={"status": status_code, "error_code": code, "error_detail": detail},
    )


def _slugify(name: str) -> str:
    """Falls back to a stable snake_case code for statuses 05_API.md does not list."""
    return "_".join(name.lower().split())
