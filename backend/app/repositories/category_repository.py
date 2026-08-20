"""Category data access (RN-03, RN-04, AD-24, AD-29)."""

from sqlalchemy import select

from ..extensions import db
from ..models import Category
from .base import ActiveSlugRepository


class CategoryRepository(ActiveSlugRepository):
    model = Category

    @classmethod
    def list_active_roots(cls) -> list[Category]:
        statement = (
            select(Category)
            .where(
                Category.is_active.is_(True),
                Category.deleted_at.is_(None),
                Category.parent_id.is_(None),
            )
            .order_by(Category.name.asc())
        )
        return list(db.session.execute(statement).scalars())

    @classmethod
    def list_active_children(cls, parent_ids) -> list[Category]:
        if not parent_ids:
            return []
        statement = (
            select(Category)
            .where(
                Category.is_active.is_(True),
                Category.deleted_at.is_(None),
                Category.parent_id.in_(list(parent_ids)),
            )
            .order_by(Category.name.asc())
        )
        return list(db.session.execute(statement).scalars())

    @classmethod
    def list_active_ids_with_descendants(cls, slugs) -> list[int]:
        """AD-29: filtering by a parent category includes its descendants.

        The hierarchy is two levels deep (AD-24), so one extra lookup suffices.
        """
        matched_ids = cls.list_active_ids_by_slugs(slugs)
        if not matched_ids:
            return []
        descendants = db.session.execute(
            select(Category.id).where(
                Category.is_active.is_(True),
                Category.deleted_at.is_(None),
                Category.parent_id.in_(matched_ids),
            )
        ).scalars()
        return list({*matched_ids, *descendants})
