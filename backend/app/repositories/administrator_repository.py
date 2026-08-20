"""Administrator data access (RN-66, RN-67)."""

from sqlalchemy import select

from ..extensions import db
from ..models import Administrator


class AdministratorRepository:
    @classmethod
    def find_by_username(cls, username: str) -> Administrator | None:
        statement = (
            select(Administrator)
            .where(
                Administrator.username == username,
                Administrator.is_active.is_(True),
                Administrator.deleted_at.is_(None),
            )
            .limit(1)
        )
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def find_by_id(cls, administrator_id: int) -> Administrator | None:
        statement = select(Administrator).where(
            Administrator.id == administrator_id,
            Administrator.deleted_at.is_(None),
        )
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def list_all(cls, *, offset: int = 0, limit: int | None = None) -> list[Administrator]:
        statement = select(Administrator).where(Administrator.deleted_at.is_(None))
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())

    @classmethod
    def count_all(cls) -> int:
        statement = select(db.func.count()).select_from(Administrator)
        return db.session.execute(statement.where(Administrator.deleted_at.is_(None))).scalar_one()

    @classmethod
    def find_by_username_including_deleted(cls, username: str, *, exclude_id: int | None = None):
        """La unicidad de `username` **incluye filas eliminadas** (04 §9.2.13).

        Igual que ocurre con los slugs (`AD-19`), el identificador de una cuenta
        retirada no se reutiliza: reasignarlo confundiría el rastro de auditoría,
        que guarda `administrator_id` pero se lee por nombre.
        """
        statement = select(Administrator).where(Administrator.username == username)
        if exclude_id is not None:
            statement = statement.where(Administrator.id != exclude_id)
        return db.session.execute(statement.limit(1)).scalar_one_or_none()

    @classmethod
    def find_by_email_including_deleted(cls, email: str, *, exclude_id: int | None = None):
        """La unicidad de `email` también incluye filas eliminadas (04 §9.2.13)."""
        statement = select(Administrator).where(Administrator.email == email)
        if exclude_id is not None:
            statement = statement.where(Administrator.id != exclude_id)
        return db.session.execute(statement.limit(1)).scalar_one_or_none()

    @classmethod
    def create(cls, **fields) -> Administrator:
        administrator = Administrator(**fields)
        db.session.add(administrator)
        db.session.flush()
        return administrator

    @classmethod
    def update(cls, administrator: Administrator, **fields) -> Administrator:
        for key, value in fields.items():
            setattr(administrator, key, value)
        db.session.flush()
        return administrator

    @classmethod
    def soft_delete(cls, administrator: Administrator) -> Administrator:
        """`AD-18`: nunca se borra físicamente una entidad de negocio."""
        from datetime import UTC, datetime

        administrator.is_active = False
        administrator.deleted_at = datetime.now(UTC)
        db.session.flush()
        return administrator

    @classmethod
    def count_active_super_administrators(cls, *, exclude_id: int | None = None) -> int:
        """`RN-71`: cuántos superadministradores activos quedarían.

        `exclude_id` permite preguntar "¿y si retiro a este?" sin haberlo
        modificado todavía, que es lo que necesita la comprobación previa.
        """
        statement = select(db.func.count()).where(
            Administrator.role == "super_administrator",
            Administrator.is_active.is_(True),
            Administrator.deleted_at.is_(None),
        )
        if exclude_id is not None:
            statement = statement.where(Administrator.id != exclude_id)
        return db.session.execute(statement).scalar_one()
