"""Acceso a datos de promociones (04_BASE_DATOS.md §9.2.11).

`RN-36`: el alcance es exactamente uno de producto, categoría o marca, y quien
lo garantiza de verdad es el CHECK `scope_exclusive` de la tabla. El servicio
valida antes para dar un error legible, pero la integridad no depende de esa
comprobación en Python.

`AD-18`: no existe borrado físico.
"""

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Promotion


class PromotionRepository:
    @classmethod
    def _with_scope(cls, statement):
        """Carga las tres relaciones de alcance: el DTO necesita `slug` y `name`."""
        return statement.options(
            joinedload(Promotion.product),
            joinedload(Promotion.category),
            joinedload(Promotion.brand),
        )

    @classmethod
    def list_all(cls, *, offset: int = 0, limit: int | None = None) -> list[Promotion]:
        statement = select(Promotion).where(Promotion.deleted_at.is_(None))
        # Más recientes primero: es lo que el panel necesita para revisar lo que
        # acaba de cargar. `id` desempata para que la paginación sea estable.
        statement = statement.order_by(Promotion.starts_at.desc(), Promotion.id.desc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(cls._with_scope(statement)).unique().scalars())

    @classmethod
    def count_all(cls) -> int:
        return db.session.execute(
            select(db.func.count()).select_from(Promotion).where(Promotion.deleted_at.is_(None))
        ).scalar_one()

    @classmethod
    def find_by_id(cls, promotion_id: int) -> Promotion | None:
        statement = select(Promotion).where(
            Promotion.id == promotion_id, Promotion.deleted_at.is_(None)
        )
        return db.session.execute(cls._with_scope(statement)).unique().scalar_one_or_none()

    @classmethod
    def create(cls, **fields) -> Promotion:
        promotion = Promotion(**fields)
        db.session.add(promotion)
        db.session.flush()
        return promotion

    @classmethod
    def update(cls, promotion: Promotion, **fields) -> Promotion:
        for key, value in fields.items():
            setattr(promotion, key, value)
        db.session.flush()
        # Se asignan las columnas FK, no las relaciones, así que `product`,
        # `category` y `brand` conservarían el objeto cargado antes del cambio.
        # Al mover el alcance de marca a categoría, el mapper seguiría leyendo
        # la marca anterior y `RN-36` parecería incumplirse en la respuesta.
        db.session.refresh(promotion)
        return promotion

    @classmethod
    def soft_delete(cls, promotion: Promotion) -> Promotion:
        """`AD-18`: la fila permanece, marcada."""
        promotion.is_active = False
        promotion.deleted_at = datetime.now(UTC)
        db.session.flush()
        return promotion
