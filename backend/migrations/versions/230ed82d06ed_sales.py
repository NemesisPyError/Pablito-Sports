"""sales

RN-82, 01_ANALISIS_NEGOCIO.md v2.6.0. Ledger inmutable de ventas registradas
por el administrador, mismo patron que `price_history` (RN-70): solo se
inserta y se consulta, nunca se edita ni se borra. Cada fila descuenta
`variants.quantity` en la misma transaccion del `INSERT` (04_BASE_DATOS.md
Sec.11.2 regla 2 aplicada por analogia).

Revision ID: 230ed82d06ed
Revises: 5a6c62009016
Create Date: 2026-08-18 21:18:26.851484

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "230ed82d06ed"
down_revision = "5a6c62009016"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "sales",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("variant_id", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("administrator_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("quantity > 0", name="sales_quantity_positive"),
        sa.ForeignKeyConstraint(
            ["administrator_id"],
            ["administrators.id"],
            name=op.f("fk_sales_administrator_id_administrators"),
            onupdate="CASCADE",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["variant_id"],
            ["variants.id"],
            name=op.f("fk_sales_variant_id_variants"),
            onupdate="CASCADE",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sales")),
    )
    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.create_index("idx_sales_variant_id", ["variant_id"], unique=False)
        batch_op.create_index("idx_sales_created_at", ["created_at"], unique=False)


def downgrade():
    with op.batch_alter_table("sales", schema=None) as batch_op:
        batch_op.drop_index("idx_sales_created_at")
        batch_op.drop_index("idx_sales_variant_id")
    op.drop_table("sales")
