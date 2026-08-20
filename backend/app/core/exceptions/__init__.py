"""Exception hierarchy and global handlers (10_BACKEND.md §10)."""

from .auth import AuthenticationError, AuthorizationError
from .base import AppException, BadRequestError, InternalError, RateLimitError
from .business import BusinessRuleError, ConcurrencyError
from .handlers import register_error_handlers
from .integration import IntegrationError
from .not_found import NotFoundError
from .validation import RequestValidationError, ValidationError

__all__ = [
    "AppException",
    "AuthenticationError",
    "AuthorizationError",
    "BadRequestError",
    "BusinessRuleError",
    "ConcurrencyError",
    "IntegrationError",
    "InternalError",
    "NotFoundError",
    "RateLimitError",
    "RequestValidationError",
    "ValidationError",
    "register_error_handlers",
]
