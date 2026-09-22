"""Catalog classification entities (04_BASE_DATOS.md §9.2.3 to §9.2.9).

Brand, Category, Sport, Gender, SizeType and Size share the same shape:
name, slug, activity flag, timestamps and logical deletion.

Slug uniqueness spans deleted rows so a slug is never reused (AD-19, RN-79).
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .base import ActiveMixin, IdentityMixin, SoftDeleteMixin, TimestampMixin


class Brand(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-05, RN-06. Desde 04 v1.1.0 es además una pieza de portada."""

    __tablename__ = "brands"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    # 04 §9.2.3 (v1.1.0). El logotipo vive en el espacio `brands` del
    # almacenamiento (99 §17.1.1).
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tagline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # NULL = la marca existe en el catálogo pero no protagoniza un bloque de
    # portada. Es la diferencia entre «marca del catálogo» y «marca destacada».
    home_position: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Franja deslizante de marcas bajo la navegación (`BrandStrip`), pedido
    # explícito del usuario. Es independiente de `home_position`: una marca
    # puede estar en la franja sin tener bloque propio en la portada, y al
    # revés. El defecto es `TRUE` porque hasta ahora la franja mostraba todas
    # las marcas activas — así el comportamiento no cambia al desplegar y el
    # administrador va quitando las que no quiera.
    show_in_strip: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("true")
    )

    images = relationship("BrandImage", back_populates="brand")

    __table_args__ = (
        CheckConstraint("home_position IS NULL OR home_position >= 0", name="home_position_valid"),
    )


class BrandImage(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """04 §9.2.18 (v1.1.0). Collage del bloque de marca de la portada.

    Calco de `Image` (§9.2.10): mismo pipeline de archivos, mismo
    reordenamiento y mismo borrado lógico. El límite de piezas es una regla de
    presentación y se valida en servicios, no en la tabla.
    """

    __tablename__ = "brand_images"

    brand_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    brand = relationship("Brand", back_populates="images")

    __table_args__ = (
        CheckConstraint("position >= 0", name="position_non_negative"),
        Index("idx_brand_images_brand_id", "brand_id"),
    )


class Category(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-03, RN-04, RN-80. Two-level hierarchy (AD-24), depth checked in services."""

    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=True,
    )

    parent = relationship("Category", remote_side="Category.id", back_populates="children")
    children = relationship("Category", back_populates="parent")

    # RN-83, AD-41: sexos a los que aplica la categoría. Lista vacía = sin
    # restricción, no «ningún sexo»: la categoría aparece en todos los ejes de
    # la navegación. El orden no importa, así que no hay columna de posición.
    genders = relationship("Gender", secondary="category_genders", lazy="selectin")

    __table_args__ = (
        CheckConstraint("parent_id IS NULL OR parent_id != id", name="parent_not_self"),
        Index("idx_categories_parent_id", "parent_id"),
    )


class Sport(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-08."""

    __tablename__ = "sports"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)


class Gender(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-09, S-06. Seeded with men, women, unisex, boys, girls."""

    __tablename__ = "genders"

    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)


class SizeType(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-15, S-07. Seeded with footwear_numeric, apparel_alpha, one_size."""

    __tablename__ = "size_types"

    name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)

    sizes = relationship("Size", back_populates="size_type")


class Size(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-14, RN-15, RN-16."""

    __tablename__ = "sizes"

    name: Mapped[str] = mapped_column(String(20), nullable=False)
    slug: Mapped[str] = mapped_column(String(20), nullable=False, unique=True)
    size_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("size_types.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    size_type = relationship("SizeType", back_populates="sizes")

    __table_args__ = (
        UniqueConstraint("name", "size_type_id", name="uq_sizes_name_size_type_id"),
        Index("idx_sizes_size_type_id", "size_type_id"),
    )
