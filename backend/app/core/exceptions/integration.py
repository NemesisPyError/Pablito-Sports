"""External integration errors (ERR-05, ERR-06, INT-04)."""

from .base import AppException


class IntegrationError(AppException):
    """502 — an external provider failed.

    ERR-05: provider internals never reach the client; only the provider name and
    a generic code are exposed.
    """

    status_code = 502
    code = "integration_error"
    default_detail = "external service unavailable"

    def __init__(self, detail: str | None = None, *, provider: str | None = None, **kwargs):
        super().__init__(detail, **kwargs)
        self.provider = provider

    def to_error(self) -> dict:
        error = super().to_error()
        error["provider"] = self.provider
        return error
