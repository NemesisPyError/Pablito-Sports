"""Admin CRUD for classification entities.

Every operation respects soft delete (AD-18) and slug uniqueness spanning
 deleted rows (AD-19, RN-79).
"""

from sqlalchemy import select

from ..extensions import db
from ..models import Brand, Category, Size, Sport


class AdminClassificationRepository:
    model = None

    @classmethod
    def list_all(cls, *, offset: int = 0, limit: int | None = None, include_deleted: bool = False):
        statement = select(cls.model)
        if not include_deleted:
            statement = statement.where(cls.model.deleted_at.is_(None))
        statement = statement.order_by(cls.model.name.asc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())

    @classmethod
    def count_all(cls, include_deleted: bool = False) -> int:
        statement = select(db.func.count()).select_from(cls.model)
        if not include_deleted:
            statement = statement.where(cls.model.deleted_at.is_(None))
        return db.session.execute(statement).scalar_one()

    @classmethod
    def find_by_id(cls, entity_id: int, *, include_deleted: bool = False):
        """Busca por identificador interno.

        `include_deleted` es imprescindible para restaurar: una entidad eliminada
        lógicamente solo se puede recuperar si primero se la puede encontrar
        (02_ARQUITECTURA.md §12.6, el panel las incluye cuando se piden).
        """
        statement = select(cls.model).where(cls.model.id == entity_id)
        if not include_deleted:
            statement = statement.where(cls.model.deleted_at.is_(None))
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def find_by_slug(cls, slug: str, exclude_id: int | None = None):
        statement = select(cls.model).where(cls.model.slug == slug)
        if exclude_id is not None:
            statement = statement.where(cls.model.id != exclude_id)
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def create(cls, **fields):
        entity = cls.model(**fields)
        db.session.add(entity)
        db.session.flush()
        return entity

    @classmethod
    def update(cls, entity, **fields):
        for key, value in fields.items():
            setattr(entity, key, value)
        db.session.flush()
        return entity

    @classmethod
    def soft_delete(cls, entity):
        from datetime import UTC, datetime

        entity.is_active = False
        entity.deleted_at = datetime.now(UTC)
        db.session.flush()
        return entity

    @classmethod
    def restore(cls, entity):
        entity.is_active = True
        entity.deleted_at = None
        db.session.flush()
        return entity


class AdminBrandRepository(AdminClassificationRepository):
    model = Brand


class AdminCategoryRepository(AdminClassificationRepository):
    model = Category


class AdminSportRepository(AdminClassificationRepository):
    model = Sport


class AdminSizeRepository(AdminClassificationRepository):
    model = Size
