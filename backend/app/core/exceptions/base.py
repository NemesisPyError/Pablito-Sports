"""Base of the exception hierarchy (10_BACKEND.md §10, ERR-01).

Every known failure inherits from AppException so the global handlers can turn it
into the AD-16 envelope without any route catching exceptions on its own.

Error codes are the ones published in 05_API.md §11.1: that document owns the API
contract, so its wire codes prevail over any other wording.
"""


class AppException(Exception):
    """Abstract root of every application error.

    Subclasses declare the HTTP status and the stable error code that reaches the
    client. `detail` is a technical description in English for logs and diagnosis
    (02_ARQUITECTURA.md §11.5); it never carries stacktraces, SQL or paths.
    """

    status_code = 500
    code = "internal_server_error"
    default_detail = "unexpected error occurred"

    def __init__(
        self, detail: str | None = None, *, rule: str | None = None, field: str | None = None
    ):
        self.detail = detail or self.default_detail
        self.rule = rule
        self.field = field
        super().__init__(self.detail)

    def to_error(self) -> dict:
        """Serialises the exception as one entry of the AD-16 `errors` array."""
        return {
            "code": self.code,
            "rule": self.rule,
            "detail": self.detail,
            "field": self.field,
        }


class BadRequestError(AppException):
    """400 — the request itself is malformed (M-02 of 10_BACKEND.md)."""

    status_code = 400
    code = "malformed_request"
    default_detail = "request could not be parsed"


class RateLimitError(AppException):
    """429 — the caller exceeded the configured rate limit (RNF-11)."""

    status_code = 429
    code = "rate_limit_exceeded"
    default_detail = "rate limit exceeded"

    def __init__(self, detail: str | None = None, *, retry_after: int | None = None, **kwargs):
        super().__init__(detail, **kwargs)
        self.retry_after = retry_after

    def to_error(self) -> dict:
        error = super().to_error()
        error["retry_after"] = self.retry_after
        return error


class InternalError(AppException):
    """500 — an unexpected technical failure."""

    status_code = 500
    code = "internal_server_error"
    default_detail = "unexpected error occurred"
