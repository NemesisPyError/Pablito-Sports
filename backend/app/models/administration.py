"""Panel entities: administrators, store settings, price history and audit log.

04_BASE_DATOS.md §9.2.13 to §9.2.16.
"""

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import INET, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..extensions import db
from .base import ActiveMixin, IdentityMixin, SoftDeleteMixin, TimestampMixin

# RN-66, RN-67, 00.3_NOMENCLATURA.md §9.3
ROLE_VALUES = ("administrator", "super_administrator")

# AD-20
AUDIT_ACTION_VALUES = ("create", "update", "delete", "activate", "deactivate")


class Administrator(IdentityMixin, ActiveMixin, TimestampMixin, SoftDeleteMixin, db.Model):
    """RN-66, RN-67. Only the password hash is stored, never the password."""

    __tablename__ = "administrators"

    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    last_login_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("role IN ('administrator', 'super_administrator')", name="role_allowed"),
    )


class StoreSetting(db.Model):
    """PA-10, RN-58 to RN-61. Single row: the application keeps only id = 1.

    §9.2.14 declares updated_at only: there is no created_at and no deleted_at,
    so the timestamp mixins do not apply here.
    """

    __tablename__ = "store_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    store_name: Mapped[str] = mapped_column(String(255), nullable=False)
    whatsapp_number: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_hours: Mapped[str | None] = mapped_column(Text, nullable=True)
    social_links: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # 04 §9.2.14 (v1.1.0). Contenido institucional, no configuración operativa:
    # su ausencia no rompe ninguna pantalla, solo oculta la sección.
    about_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    about_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    about_image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    message_template: Mapped[str] = mapped_column(Text, nullable=False)
    item_template: Mapped[str] = mapped_column(Text, nullable=False)
    featured_products_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="8"
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("featured_products_count > 0", name="featured_products_count_positive"),
    )


class PriceHistory(IdentityMixin, db.Model):
    """RN-70. Immutable: no updated_at, no deleted_at (§9.2.15)."""

    __tablename__ = "price_history"

    product_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    old_price: Mapped[int] = mapped_column(Integer, nullable=False)
    new_price: Mapped[int] = mapped_column(Integer, nullable=False)
    administrator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("administrators.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    product = relationship("Product")
    administrator = relationship("Administrator")

    __table_args__ = (Index("idx_price_history_product_id", "product_id"),)


class SaleOrder(IdentityMixin, db.Model):
    """Cabecera de una venta registrada a mano desde el panel (RN-82).

    Agrupa las lineas de `sales` que se registraron juntas y guarda el total.
    Inmutable, igual que sus lineas y que `PriceHistory` (RN-70): no se edita ni
    se borra, ni logicamente.

    `total_amount` se guarda aunque sea la suma de las lineas. No es
    denormalizacion por comodidad: las lineas guardan el precio unitario
    vigente en ese momento, y el total es el importe que efectivamente se cobro.
    Recalcularlo despues a partir de otra cosa daria un numero distinto.

    Moneda: entero, como `products.list_price`. El guarani no tiene subunidad,
    asi que no hay decimales que perder ni redondeos que arrastrar.
    """

    __tablename__ = "sale_orders"

    administrator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("administrators.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    total_amount: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    administrator = relationship("Administrator")
    items = relationship("Sale", back_populates="order")

    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="sale_orders_total_non_negative"),
        Index("idx_sale_orders_created_at", "created_at"),
        Index("idx_sale_orders_administrator_id", "administrator_id"),
    )


class Sale(IdentityMixin, db.Model):
    """RN-82. Immutable: no updated_at, no deleted_at, same pattern as PriceHistory."""

    __tablename__ = "sales"

    variant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("variants.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Nulos a proposito: las filas anteriores a la venta manual multilinea no
    # tienen ni cabecera ni precio, y rellenarlos con el precio de hoy seria
    # inventar un dato historico. Toda venta registrada desde el panel los trae.
    sale_order_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("sale_orders.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=True,
    )
    unit_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    administrator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("administrators.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    variant = relationship("Variant")
    administrator = relationship("Administrator")
    order = relationship("SaleOrder", back_populates="items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="sales_quantity_positive"),
        CheckConstraint(
            "unit_price IS NULL OR unit_price >= 0",
            name="sales_unit_price_non_negative",
        ),
        Index("idx_sales_variant_id", "variant_id"),
        Index("idx_sales_created_at", "created_at"),
        Index("idx_sales_sale_order_id", "sale_order_id"),
    )


class AuditLog(IdentityMixin, db.Model):
    """AD-20. Immutable: no updated_at, no deleted_at (§9.2.16)."""

    __tablename__ = "audit_logs"

    administrator_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("administrators.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    old_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    new_values: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(INET, nullable=True)
    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    administrator = relationship("Administrator")

    __table_args__ = (
        CheckConstraint(
            "action IN ('create', 'update', 'delete', 'activate', 'deactivate')",
            name="action_allowed",
        ),
        Index("idx_audit_logs_entity", "entity_type", "entity_id"),
        Index("idx_audit_logs_administrator_id", "administrator_id"),
    )
