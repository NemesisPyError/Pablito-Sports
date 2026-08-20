"""Validation errors (ERR-04): the request is well formed but its content is not."""

from .base import AppException


class ValidationError(AppException):
    """422 — schema or format validation failed."""

    status_code = 422
    code = "validation_error"
    default_detail = "payload failed validation"


class RequestValidationError(ValidationError):
    """422 — the input schema rejected the request body or query string.

    Carries one entry per offending field so a multi-field failure resolves in a
    single response (AD-16).
    """

    def __init__(self, errors: list[dict] | None = None, detail: str | None = None, **kwargs):
        super().__init__(detail, **kwargs)
        self._errors = errors or []

    def to_errors(self) -> list[dict]:
        """Returns one AD-16 error entry per invalid field."""
        if not self._errors:
            return [self.to_error()]
        return [
            {
                "code": self.code,
                "rule": None,
                "detail": item.get("detail", self.default_detail),
                "field": item.get("field"),
            }
            for item in self._errors
        ]
