"""Registration point of the global error handlers.

The handler functions are defined in core/exceptions/handlers.py; this module
only wires them to the application (correction O-04 of 10_BACKEND.md).
"""

from flask import Flask

from ..core.exceptions import register_error_handlers as _register


def init_app(app: Flask) -> None:
    """Registers the AD-16 error handlers on the application."""
    _register(app)
