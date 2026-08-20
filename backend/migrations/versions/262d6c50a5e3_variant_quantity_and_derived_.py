"""variant_quantity_and_derived_availability

Esquema de la tanda funcional de stock real (RN-38b, 04_BASE_DATOS.md
v1.2.0). Migracion de ESQUEMA unicamente (04 Sec.11.2 regla 3): agrega
`variants.quantity` con su CHECK, y reduce el CHECK de
`products.availability` de 4 a 3 valores (se retira `coming_soon`, sin
datos que lo usaran al momento de escribir esto). El backfill de datos que
preserva el estado visible de los productos existentes va en la migracion
siguiente (data-only).

Revision ID: 262d6c50a5e3
Revises: d4f83a17c9b2
Create Date: 2026-08-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '262d6c50a5e3'
down_revision = 'd4f83a17c9b2'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('variants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('quantity', sa.Integer(), server_default='0', nullable=False))
        batch_op.create_check_constraint(
            'variants_quantity_non_negative', 'quantity >= 0'
        )

    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_constraint('availability_allowed', type_='check')
        batch_op.create_check_constraint(
            'availability_allowed',
            "availability IN ('available', 'low_stock', 'out_of_stock')",
        )


def downgrade():
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_constraint('availability_allowed', type_='check')
        batch_op.create_check_constraint(
            'availability_allowed',
            "availability IN ('available', 'low_stock', 'out_of_stock', 'coming_soon')",
        )

    with op.batch_alter_table('variants', schema=None) as batch_op:
        batch_op.drop_constraint('variants_quantity_non_negative', type_='check')
        batch_op.drop_column('quantity')
