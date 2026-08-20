"""Size data access (RN-14, RN-15, RN-16)."""

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Size, SizeType
from .base import ActiveSlugRepository


class SizeRepository(ActiveSlugRepository):
    model = Size

    @classmethod
    def _visible_with_type(cls, size_type_slug: str | None = None):
        statement = (
            select(Size)
            .join(SizeType, Size.size_type_id == SizeType.id)
            .options(joinedload(Size.size_type))
            .where(
                Size.is_active.is_(True),
                Size.deleted_at.is_(None),
                SizeType.is_active.is_(True),
                SizeType.deleted_at.is_(None),
            )
        )
        if size_type_slug:
            statement = statement.where(SizeType.slug == size_type_slug)
        return statement

    @classmethod
    def count_active_by_size_type(cls, size_type_slug: str | None = None) -> int:
        return db.session.execute(
            select(db.func.count()).select_from(cls._visible_with_type(size_type_slug).subquery())
        ).scalar_one()

    @classmethod
    def list_active_by_size_type(
        cls, size_type_slug: str | None = None, *, offset: int = 0, limit: int | None = None
    ) -> list[Size]:
        """§7.9: ordered by size type and then name."""
        statement = cls._visible_with_type(size_type_slug).order_by(
            SizeType.name.asc(), Size.name.asc()
        )
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())
