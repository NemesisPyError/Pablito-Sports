"""Variant data access for cart revalidation (AD-15)."""

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Variant


class VariantRepository:
    @classmethod
    def find_by_ids_with_product(cls, variant_ids) -> dict[int, Variant]:
        """Returns every variant asked for, deleted ones included.

        A soft-deleted variant still has to be reported so the client can be told
        it disappeared (AD-25); filtering it out here would make it look like it
        never existed.
        """
        if not variant_ids:
            return {}
        statement = (
            select(Variant)
            .where(Variant.id.in_(list(variant_ids)))
            .options(joinedload(Variant.product))
        )
        return {variant.id: variant for variant in db.session.execute(statement).scalars()}
