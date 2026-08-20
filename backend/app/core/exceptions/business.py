"""Business rule errors (ERR-03)."""

from .base import AppException


class BusinessRuleError(AppException):
    """409 — the request is valid but the domain rejects it.

    ERR-03: every BusinessRuleError must name the violated RN-xx. Raising one
    without a rule is a programming error and fails loudly.
    """

    status_code = 409
    code = "business_rule_violation"
    default_detail = "business rule violated"

    def __init__(self, detail: str | None = None, *, rule: str | None = None, **kwargs):
        if not rule:
            raise ValueError("BusinessRuleError requires the violated RN-xx (ERR-03)")
        super().__init__(detail, rule=rule, **kwargs)


class ConcurrencyError(AppException):
    """409 — the entity changed since the caller read it (10_BACKEND.md §14.2)."""

    status_code = 409
    code = "conflict"
    default_detail = "resource was modified by another request"
