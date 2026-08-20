"""Lectura del registro de auditoría (AD-20, 05_API.md §9.15).

`audit_logs` es inmutable (04_BASE_DATOS.md §14.3 regla 3): este repositorio
**solo lee**. No expone insert —eso pertenece a `core/audit`, que lo hace dentro
de la transacción de la escritura auditada— ni actualización ni borrado.
"""

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import AuditLog


class AuditLogRepository:
    @classmethod
    def list_all(
        cls,
        *,
        offset: int = 0,
        limit: int | None = None,
        entity_type: str | None = None,
        entity_id: int | None = None,
        administrator_id: int | None = None,
        actions: list[str] | None = None,
        created_from=None,
        created_to=None,
    ) -> list[AuditLog]:
        """§9.15. Más reciente primero: la auditoría se lee hacia atrás."""
        statement = cls._filtered(
            entity_type, entity_id, administrator_id, actions, created_from, created_to
        )
        statement = statement.options(joinedload(AuditLog.administrator))
        statement = statement.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).unique().scalars())

    @classmethod
    def count_all(
        cls,
        *,
        entity_type: str | None = None,
        entity_id: int | None = None,
        administrator_id: int | None = None,
        actions: list[str] | None = None,
        created_from=None,
        created_to=None,
    ) -> int:
        statement = cls._filtered(
            entity_type, entity_id, administrator_id, actions, created_from, created_to
        )
        return db.session.execute(
            select(db.func.count()).select_from(statement.subquery())
        ).scalar_one()

    @classmethod
    def _filtered(cls, entity_type, entity_id, administrator_id, actions, created_from, created_to):
        statement = select(AuditLog)
        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)
        if entity_id is not None:
            statement = statement.where(AuditLog.entity_id == entity_id)
        if administrator_id is not None:
            statement = statement.where(AuditLog.administrator_id == administrator_id)
        if actions:
            statement = statement.where(AuditLog.action.in_(actions))
        if created_from is not None:
            statement = statement.where(AuditLog.created_at >= created_from)
        if created_to is not None:
            statement = statement.where(AuditLog.created_at <= created_to)
        return statement
