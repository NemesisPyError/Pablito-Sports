"""Resource lookup errors."""

from .base import AppException


class NotFoundError(AppException):
    """404 — the resource does not exist or is not visible to the caller."""

    status_code = 404
    code = "resource_not_found"
    default_detail = "resource not found or not visible"

    def __init__(self, detail: str | None = None, *, resource: str | None = None, **kwargs):
        super().__init__(detail, **kwargs)
        self.resource = resource

    def to_error(self) -> dict:
        error = super().to_error()
        error["resource"] = self.resource
        return error
