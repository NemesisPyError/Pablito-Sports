"""Sistema de auditoría (AD-20). No es un nivel de log: es un sistema aparte."""

from .service import (
    ACTION_ACTIVATE,
    ACTION_CREATE,
    ACTION_DEACTIVATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AuditService,
)

__all__ = [
    "AuditService",
    "ACTION_CREATE",
    "ACTION_UPDATE",
    "ACTION_DELETE",
    "ACTION_ACTIVATE",
    "ACTION_DEACTIVATE",
]
