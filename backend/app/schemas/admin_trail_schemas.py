"""Parámetros de consulta de los rastros del panel (05_API.md §9.15, §9.16).

Los schemas validan forma, no negocio, y no tocan la base de datos
(10_BACKEND.md §8.2). Un parámetro conocido pero mal formado es 422; uno
desconocido se ignora (`AD-26`).
"""

from dataclasses import dataclass, field
from datetime import datetime

from ..core.exceptions import RequestValidationError
from ..core.utils.pagination import PageRequest
from .shared import parse_int, parse_page_request, parse_slug_list

# §9.15: conjunto cerrado, el mismo del CHECK `action_allowed`.
AUDIT_ACTIONS = ("create", "update", "delete", "activate", "deactivate")


def _parse_datetime(args, name: str) -> datetime | None:
    raw = (args.get(name) or "").strip()
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw)
    except ValueError:
        raise RequestValidationError(
            [{"field": name, "detail": f"{name} must be an ISO 8601 datetime"}]
        ) from None


@dataclass
class AuditLogQuery:
    entity_type: str | None = None
    entity_id: int | None = None
    administrator_id: int | None = None
    actions: list[str] = field(default_factory=list)
    created_from: datetime | None = None
    created_to: datetime | None = None
    page: PageRequest = field(default_factory=PageRequest)


def parse_audit_log_query(args) -> AuditLogQuery:
    """§9.15. `action` admite un valor o una lista separada por comas."""
    actions = parse_slug_list(args, "action")
    unknown = [action for action in actions if action not in AUDIT_ACTIONS]
    if unknown:
        raise RequestValidationError(
            [
                {
                    "field": "action",
                    "detail": "action must be one of " + ", ".join(AUDIT_ACTIONS),
                }
            ]
        )

    return AuditLogQuery(
        entity_type=(args.get("entity_type") or "").strip() or None,
        entity_id=parse_int(args, "entity_id", minimum=1),
        administrator_id=parse_int(args, "administrator_id", minimum=1),
        actions=actions,
        created_from=_parse_datetime(args, "from"),
        created_to=_parse_datetime(args, "to"),
        page=parse_page_request(args),
    )


@dataclass
class PriceHistoryQuery:
    product_id: int | None = None
    administrator_id: int | None = None
    created_from: datetime | None = None
    created_to: datetime | None = None
    page: PageRequest = field(default_factory=PageRequest)


def parse_price_history_query(args) -> PriceHistoryQuery:
    """§9.16."""
    return PriceHistoryQuery(
        product_id=parse_int(args, "product_id", minimum=1),
        administrator_id=parse_int(args, "administrator_id", minimum=1),
        created_from=_parse_datetime(args, "from"),
        created_to=_parse_datetime(args, "to"),
        page=parse_page_request(args),
    )
