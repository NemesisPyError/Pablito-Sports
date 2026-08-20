"""Version 1 of the JSON API (AD-17)."""

from .admin import admin_bp
from .public import public_bp

__all__ = ["admin_bp", "public_bp"]
