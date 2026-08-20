"""Promotions and banners (04_BASE_DATOS.md §9.2.11, §9.2.12)."""

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .base import ActiveMixin, IdentityMixin, SoftDeleteMixin, TimestampMixin


class Promotion(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-30 to RN-38b, DN-03."""

    __tablename__ = "promotions"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    discount_percentage: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

    product_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=True
    )
    category_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=True
    )
    brand_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=True
    )

    product = relationship("Product")
    category = relationship("Category")
    brand = relationship("Brand")

    __table_args__ = (
        CheckConstraint("discount_percentage BETWEEN 1 AND 99", name="discount_percentage_range"),
        CheckConstraint("ends_at IS NULL OR ends_at > starts_at", name="window_ordered"),
        # RN-36: a promotion applies to exactly one of product, category or brand.
        CheckConstraint(
            "(product_id IS NOT NULL)::int + (category_id IS NOT NULL)::int "
            "+ (brand_id IS NOT NULL)::int = 1",
            name="scope_exclusive",
        ),
        Index("idx_promotions_product_id", "product_id"),
        Index("idx_promotions_category_id", "category_id"),
        Index("idx_promotions_brand_id", "brand_id"),
        Index("idx_promotions_dates", "starts_at", "ends_at"),
    )


# 04 §9.2.12 (v1.1.0). Las tres zonas administrables de la portada.
BANNER_PLACEMENT_VALUES = ("hero", "news", "promo")
DEFAULT_BANNER_PLACEMENT = "hero"


class Banner(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-73, RN-74.

    `placement` distingue las tres zonas de la portada —hero, novedades y
    promociones— que piden exactamente los mismos campos. Un discriminador
    evita tres entidades gemelas con tres CRUD y tres pantallas idénticas
    (04 §9.2.12).
    """

    __tablename__ = "banners"

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    link_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    button_label: Mapped[str | None] = mapped_column(String(50), nullable=True)
    placement: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=DEFAULT_BANNER_PLACEMENT
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    starts_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("position >= 0", name="position_non_negative"),
        CheckConstraint(
            "placement IN ('hero', 'news', 'promo')",
            name="placement_allowed",
        ),
        CheckConstraint(
            "ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at", name="window_ordered"
        ),
        Index("idx_banners_placement", "placement"),
    )
