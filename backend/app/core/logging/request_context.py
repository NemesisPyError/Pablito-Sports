"""Correlation identifier for every request (OA-09, 02_ARQUITECTURA.md §9.13).

The identifier is generated at the start of each request, travels in the logging
context, is echoed in the `X-Request-Id` response header and is published in
`meta.request_id` of every AD-16 envelope.
"""

import re
import time
import uuid

from flask import Flask, g, request

REQUEST_ID_HEADER = "X-Request-Id"

# AD-16 publishes an 8-character hexadecimal identifier.
_REQUEST_ID_LENGTH = 8
_SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def new_request_id() -> str:
    """Generates a short correlation identifier."""
    return uuid.uuid4().hex[:_REQUEST_ID_LENGTH]


def get_request_id() -> str | None:
    """Returns the identifier of the request in flight, if there is one."""
    return getattr(g, "request_id", None)


def _incoming_request_id() -> str | None:
    """Reuses an upstream identifier only when it is safe to log and echo."""
    candidate = request.headers.get(REQUEST_ID_HEADER, "").strip()
    return candidate if _SAFE_REQUEST_ID.match(candidate) else None


def init_app(app: Flask) -> None:
    """Registers the request-id middleware (10_BACKEND.md §11, order 1)."""

    @app.before_request
    def _assign_request_id() -> None:
        g.request_id = _incoming_request_id() or new_request_id()
        g.request_started_at = time.perf_counter()

    @app.after_request
    def _echo_request_id(response):
        request_id = get_request_id()
        if request_id:
            response.headers[REQUEST_ID_HEADER] = request_id
        return response
