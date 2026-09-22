"""Cross-cutting decorators (10_BACKEND.md §9)."""

from .requires_role import current_administrator, requires_admin, requires_super_admin
from .transactional import schedule_file_deletion, transactional

__all__ = [
    "requires_admin",
    "requires_super_admin",
    "current_administrator",
    "transactional",
    "schedule_file_deletion",
]
