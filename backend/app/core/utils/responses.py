"""AD-16 response envelope.

Every JSON response of the API — success or failure — has the same shape, and
`meta` always carries the correlation identifier (05_API.md §4.3, OA-09).
"""

from flask import Response, jsonify

from ..logging.request_context import get_request_id


def success_response(
    data=None, *, meta: dict | None = None, status_code: int = 200
) -> tuple[Response, int]:
    """Wraps a payload in the AD-16 success envelope."""
    return (
        jsonify(
            {
                "success": True,
                "data": data,
                "errors": [],
                "meta": _with_request_id(meta),
            }
        ),
        status_code,
    )


def error_response(
    errors: list[dict], *, status_code: int, meta: dict | None = None
) -> tuple[Response, int]:
    """Wraps one or more error entries in the AD-16 error envelope."""
    return (
        jsonify(
            {
                "success": False,
                "data": None,
                "errors": errors,
                "meta": _with_request_id(meta),
            }
        ),
        status_code,
    )


def _with_request_id(meta: dict | None) -> dict:
    """Guarantees `meta.request_id` without letting callers override it."""
    enriched = dict(meta or {})
    enriched["request_id"] = get_request_id()
    return enriched
