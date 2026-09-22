"""Bancos de Superdescuentos (04_BASE_DATOS.md §9.2.13).

Entidad propia, no una extensión de `Promotion` (atada por `scope_exclusive` a
producto/categoría/marca) ni de `Banner` (atado a las tres zonas fijas de
portada, `BANNER_PLACEMENT_VALUES`): un banco es una tarjeta informativa de
descuento por medio de pago, sin ninguno de esos dos conceptos.
"""

from sqlalchemy import CheckConstraint, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..extensions import db
from .base import ActiveMixin, IdentityMixin, SoftDeleteMixin, TimestampMixin


class Bank(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """Tarjeta de banco en Superdescuentos: nombre, porcentaje y mini banner."""

    __tablename__ = "banks"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    discount_percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    __table_args__ = (
        CheckConstraint("discount_percentage BETWEEN 1 AND 99", name="discount_percentage_range"),
        CheckConstraint("position >= 0", name="position_non_negative"),
    )
