"""Reusable query-string parsing (10_BACKEND.md §8.2).

Schemas validate shape only: no business logic and no database access. A malformed
known parameter is a 422 (05_API.md §11); an unknown parameter is ignored (AD-26).
"""

from ..core.exceptions import RequestValidationError
from ..core.utils.pagination import DEFAULT_PAGE, DEFAULT_PER_PAGE, PageRequest, clamp_per_page

TRUE_VALUES = {"true", "1"}
FALSE_VALUES = {"false", "0"}


def parse_int(args, name: str, *, minimum: int | None = None, default: int | None = None):
    raw = args.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise RequestValidationError(
            [{"field": name, "detail": f"{name} must be an integer"}]
        ) from None
    if minimum is not None and value < minimum:
        raise RequestValidationError(
            [{"field": name, "detail": f"{name} must be greater than or equal to {minimum}"}]
        )
    return value


def parse_bool(args, name: str) -> bool | None:
    raw = args.get(name)
    if raw is None or raw == "":
        return None
    normalised = raw.strip().lower()
    if normalised in TRUE_VALUES:
        return True
    if normalised in FALSE_VALUES:
        return False
    raise RequestValidationError([{"field": name, "detail": f"{name} must be a boolean"}])


def parse_slug_list(args, name: str) -> list[str]:
    """§4.5: several values of the same criterion arrive comma separated."""
    raw = args.get(name)
    if not raw:
        return []
    return [slug.strip() for slug in raw.split(",") if slug.strip()]


def parse_page_request(args) -> PageRequest:
    """§4.4: page >= 1; per_page above the maximum is capped silently."""
    page = parse_int(args, "page", minimum=1, default=DEFAULT_PAGE)
    per_page = parse_int(args, "per_page", minimum=1, default=DEFAULT_PER_PAGE)
    return PageRequest(page=page, per_page=clamp_per_page(per_page))
