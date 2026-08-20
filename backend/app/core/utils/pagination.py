"""Offset pagination (AD-31, 05_API.md §4.4)."""

from dataclasses import dataclass
from math import ceil

DEFAULT_PAGE = 1
DEFAULT_PER_PAGE = 20
MAX_PER_PAGE = 100


@dataclass(frozen=True)
class PageRequest:
    """Validated pagination input."""

    page: int = DEFAULT_PAGE
    per_page: int = DEFAULT_PER_PAGE

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.per_page

    @property
    def limit(self) -> int:
        return self.per_page


@dataclass(frozen=True)
class Page:
    """A slice of results plus the totals that travel in `meta`."""

    items: list
    page: int
    per_page: int
    total: int

    @property
    def total_pages(self) -> int:
        return ceil(self.total / self.per_page) if self.per_page else 0

    def to_meta(self) -> dict:
        return {
            "page": self.page,
            "per_page": self.per_page,
            "total": self.total,
            "total_pages": self.total_pages,
        }


def clamp_per_page(value: int) -> int:
    """§4.4: a per_page above the maximum is capped silently."""
    return min(value, MAX_PER_PAGE)


def parse_page_request(args: dict) -> PageRequest:
    """Parses page and per_page from query string."""
    try:
        page = max(1, int(args.get("page", DEFAULT_PAGE)))
    except (ValueError, TypeError):
        page = DEFAULT_PAGE
    try:
        per_page = clamp_per_page(max(1, int(args.get("per_page", DEFAULT_PER_PAGE))))
    except (ValueError, TypeError):
        per_page = DEFAULT_PER_PAGE
    return PageRequest(page=page, per_page=per_page)
