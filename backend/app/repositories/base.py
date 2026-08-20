"""Light base for classification repositories (BK-01).

BK-01 allows a very light base class but forbids a universal generic repository:
each aggregate keeps its own explicit repository below.

Repositories receive ids, entities or simple parameters — never DTOs — and never
issue a physical DELETE of business data (AD-18).
"""

from sqlalchemy import select

from ..extensions import db


class ActiveSlugRepository:
    """Shared reads for entities identified by slug and hidden by is_active.

    Public visibility is `is_active = TRUE AND deleted_at IS NULL`
    (04_BASE_DATOS.md §13.2, 05.1 §6.6).
    """

    model = None

    @classmethod
    def _visible(cls):
        return select(cls.model).where(
            cls.model.is_active.is_(True), cls.model.deleted_at.is_(None)
        )

    @classmethod
    def count_active(cls) -> int:
        return db.session.execute(
            select(db.func.count()).select_from(cls._visible().subquery())
        ).scalar_one()

    @classmethod
    def list_active(cls, *, offset: int = 0, limit: int | None = None) -> list:
        statement = cls._visible().order_by(cls.model.name.asc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())

    @classmethod
    def find_active_by_slug(cls, slug: str):
        return db.session.execute(cls._visible().where(cls.model.slug == slug)).scalar_one_or_none()

    @classmethod
    def find_by_id(cls, entity_id: int):
        return db.session.execute(
            select(cls.model).where(cls.model.id == entity_id, cls.model.deleted_at.is_(None))
        ).scalar_one_or_none()

    @classmethod
    def list_active_ids_by_slugs(cls, slugs) -> list[int]:
        if not slugs:
            return []
        statement = select(cls.model.id).where(
            cls.model.is_active.is_(True),
            cls.model.deleted_at.is_(None),
            cls.model.slug.in_(list(slugs)),
        )
        return list(db.session.execute(statement).scalars())
