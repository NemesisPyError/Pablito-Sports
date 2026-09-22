"""Acceso a datos de bancos para el panel de Superdescuentos.

Mismo criterio que `admin_banner_repository.py`: el panel necesita ver todos
los bancos, activos e inactivos. `AD-18`: no existe borrado físico.
"""

from datetime import UTC, datetime

from sqlalchemy import func, select

from ..extensions import db
from ..models import Bank


class AdminBankRepository:
    @classmethod
    def count_live_with_path(cls, image_path: str, *, excluding_id: int) -> int:
        """Cuántos bancos VIVOS distintos de `excluding_id` usan ese archivo.

        Mismo motivo que en banners: las rutas llevan la huella del contenido,
        así que subir dos veces la misma imagen produce la misma ruta.
        """
        statement = (
            select(func.count())
            .select_from(Bank)
            .where(
                Bank.image_path == image_path,
                Bank.id != excluding_id,
                Bank.deleted_at.is_(None),
            )
        )
        return db.session.execute(statement).scalar_one()

    @classmethod
    def list_all(cls, *, offset: int = 0, limit: int | None = None) -> list[Bank]:
        """Orden de aparición propio: por `position`, `id` desempata."""
        statement = cls._base().order_by(Bank.position.asc(), Bank.id.asc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())

    @classmethod
    def count_all(cls) -> int:
        statement = select(func.count()).select_from(cls._base().subquery())
        return db.session.execute(statement).scalar_one()

    @classmethod
    def _base(cls):
        return select(Bank).where(Bank.deleted_at.is_(None))

    @classmethod
    def find_by_id(cls, bank_id: int) -> Bank | None:
        return db.session.execute(
            select(Bank).where(Bank.id == bank_id, Bank.deleted_at.is_(None))
        ).scalar_one_or_none()

    @classmethod
    def create(cls, **fields) -> Bank:
        bank = Bank(**fields)
        db.session.add(bank)
        db.session.flush()
        return bank

    @classmethod
    def update(cls, bank: Bank, **fields) -> Bank:
        for key, value in fields.items():
            setattr(bank, key, value)
        db.session.flush()
        return bank

    @classmethod
    def soft_delete(cls, bank: Bank) -> Bank:
        """`AD-18`: la fila permanece, marcada."""
        bank.is_active = False
        bank.deleted_at = datetime.now(UTC)
        db.session.flush()
        return bank
