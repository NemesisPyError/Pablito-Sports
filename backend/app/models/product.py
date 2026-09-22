"""Product and its variants (04_BASE_DATOS.md §9.2.1, §9.2.2)."""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.utils.stock import AVAILABLE, LOW_STOCK, OUT_OF_STOCK
from ..extensions import db
from .associations import product_categories, product_genders, product_sizes, product_sports
from .base import ActiveMixin, IdentityMixin, SoftDeleteMixin, TimestampMixin

# RN-38, RN-38b, 00.3_NOMENCLATURA.md §9.1. v1.2.0: se retira "coming_soon",
# sin datos que lo usaran; el dominio queda derivado de `variants.quantity`
# (`core.utils.stock.derive_availability`).
AVAILABILITY_VALUES = (AVAILABLE, LOW_STOCK, OUT_OF_STOCK)


class Product(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-01 to RN-12. Prices are integers in PYG, no decimals (RN-23, RN-24)."""

    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)

    list_price: Mapped[int] = mapped_column(Integer, nullable=False)
    sale_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sale_starts_at: Mapped["DateTime | None"] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    sale_ends_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

    availability: Mapped[str] = mapped_column(String(20), nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_new: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    # NULL = no está en Novedades. Mismo patrón que `Brand.home_position`
    # (04 §9.2.3): un entero marca la curaduría y el orden a la vez, y no se
    # confunde con `is_new` (autotoggle del propio producto, sin curaduría ni
    # orden) ni con `is_featured` (ya es la sección "Destacados").
    home_new_position: Mapped[int | None] = mapped_column(Integer, nullable=True)

    primary_category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    size_type_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("size_types.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    brand_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("brands.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )

    brand = relationship("Brand")
    size_type = relationship("SizeType")
    primary_category = relationship("Category")

    categories = relationship("Category", secondary=product_categories)
    sports = relationship("Sport", secondary=product_sports)
    sizes = relationship("Size", secondary=product_sizes)
    # RN-09 (v2.9.0): un producto puede pertenecer a varios sexos — antes era
    # `gender_id`, una FK simple. Sin "primaria": a diferencia de
    # `primary_category_id`, ningún sexo de la lista pesa más que otro para
    # mostrar, mismo criterio que `sports` (RN-08). Al menos uno es
    # obligatorio, pero eso no lo puede expresar una FK ni un `CHECK` sobre
    # esta tabla — lo valida el servicio (`AdminProductService`).
    genders = relationship("Gender", secondary=product_genders)

    # Orden estático por talle (mismo criterio que `available_sizes_for`,
    # `ProductRepository`): sin esto, dos SELECT del mismo `variants` sin
    # ORDER BY explícito pueden devolver filas en orden distinto entre sí —
    # Postgres no garantiza ninguno —, y una edición de `quantity` (UPDATE)
    # puede alterar el orden físico de la fila. El panel mostraba las
    # variantes "saltando" de lugar al cargar cantidad, no por diseño.
    variants = relationship(
        "Variant", back_populates="product", order_by="Variant.size_id, Variant.id"
    )
    images = relationship("Image", back_populates="product")

    __table_args__ = (
        CheckConstraint("list_price > 0", name="list_price_positive"),
        # RN-31
        CheckConstraint(
            "sale_price IS NULL OR sale_price < list_price", name="sale_price_below_list"
        ),
        # RN-32, RN-33
        CheckConstraint(
            "sale_ends_at IS NULL OR sale_starts_at IS NULL OR sale_ends_at > sale_starts_at",
            name="sale_window_ordered",
        ),
        CheckConstraint(
            "availability IN ('available', 'low_stock', 'out_of_stock')",
            name="availability_allowed",
        ),
        CheckConstraint(
            "home_new_position IS NULL OR home_new_position >= 0", name="home_new_position_valid"
        ),
        Index("idx_products_brand_id", "brand_id"),
        Index("idx_products_size_type_id", "size_type_id"),
        Index("idx_products_primary_category_id", "primary_category_id"),
        Index("idx_products_availability", "availability"),
        Index("idx_products_list_price", "list_price"),
        Index("idx_products_active_not_deleted", "is_active", "deleted_at"),
        Index("idx_products_sale_dates", "sale_starts_at", "sale_ends_at"),
        # RN-48, AD-21: accent- and case-insensitive search.
        Index("idx_products_search", text("lower(immutable_unaccent(name))")),
    )


class Variant(IdentityMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """DN-01, AD-15. Materialised colour/size combination of a product.

    No is_active on purpose: there is no v1 operation to hide a variant
    without deleting it (§9.2.2). Since v1.2.0 each variant carries its own
    `quantity`; the product's availability is derived from the sum across its
    live variants (RN-18, RN-38b), not stored independently.
    """

    __tablename__ = "variants"

    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    size_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("sizes.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=True
    )
    # RN-18, RN-38b (v1.2.0): cantidad real, fuente de verdad del stock. La
    # disponibilidad (propia y la del producto padre) se deriva de este
    # número, no se guarda como estado independiente.
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    product = relationship("Product", back_populates="variants")
    size = relationship("Size")

    __table_args__ = (
        # AD-15: one live variant per (product, size); COALESCE makes the
        # NULL case comparable.
        Index(
            "uq_variants_product_size",
            "product_id",
            text("COALESCE(size_id, 0)"),
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("idx_variants_product_id", "product_id"),
        Index("idx_variants_size_id", "size_id"),
        CheckConstraint("quantity >= 0", name="variants_quantity_non_negative"),
    )


class Image(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-19 to RN-22. The file lives on the persistent volume (AD-05, AD-38)."""

    __tablename__ = "images"

    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)

    product = relationship("Product", back_populates="images")

    __table_args__ = (
        CheckConstraint("position >= 0", name="position_non_negative"),
        # RN-20: at most one primary image per product among live rows.
        Index(
            "uq_images_primary_per_product",
            "product_id",
            unique=True,
            postgresql_where=text("is_primary = true AND deleted_at IS NULL"),
        ),
        Index("idx_images_product_id", "product_id"),
    )
