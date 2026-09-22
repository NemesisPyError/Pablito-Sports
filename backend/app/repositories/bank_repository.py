"""Bank data access for the public Superdescuentos section."""

from sqlalchemy import select

from ..extensions import db
from ..models import Bank


class BankRepository:
    @classmethod
    def list_active(cls) -> list[Bank]:
        """Bancos activos, ordenados por `position` (`id` desempata)."""
        statement = (
            select(Bank)
            .where(Bank.is_active.is_(True), Bank.deleted_at.is_(None))
            .order_by(Bank.position.asc(), Bank.id.asc())
        )
        return list(db.session.execute(statement).scalars())
