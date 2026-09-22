"""manual_sale_orders

Venta manual multilinea desde el panel de Productos.

Hasta ahora `sales` era una fila por variante vendida: `variant_id`, `quantity`,
quien la registro y cuando. Suficiente para descontar stock, pero no para lo que
pide el registro manual de ventas:

- una venta puede tener **varias lineas** y hay que saber cuales fueron juntas;
- cada linea guarda el **precio al que se vendio**, no el precio de hoy;
- la venta tiene un **total**, que es el importe que efectivamente se cobro.

Por eso:

1. `sale_orders` — la cabecera. Quien la registro, el total y cuando. Inmutable,
   mismo patron que `price_history` (RN-70) y que las propias lineas.

2. `sales` suma `sale_order_id` y `unit_price`, **ambas nulas**. No es descuido:
   las filas escritas antes de esta migracion no tienen cabecera ni precio, y
   rellenarlas con el precio vigente hoy seria inventar un dato historico —
   exactamente lo que el snapshot de precio existe para evitar. Una fila con
   `unit_price IS NULL` significa "venta anterior al registro manual", no
   "venta a precio cero".

Moneda: `Integer`, igual que `products.list_price`. El guarani no tiene
subunidad; no hay decimales que perder ni redondeo que arrastrar. No se usa
`Numeric` porque introduciria dos representaciones monetarias en el mismo
esquema.

`ondelete="RESTRICT"`: una cabecera no puede desaparecer dejando lineas
huerfanas, ni al reves. El registro de ventas no se borra.

Reversible: downgrade() quita las dos columnas y la tabla. Las ventas
registradas con este flujo perderian precio y agrupacion, que es lo que
significa volver al esquema anterior.

Depende de: a1c4e77b90d2

Revision ID: e6a2b91c73df
Revises: a1c4e77b90d2
Create Date: 2026-09-09

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'e6a2b91c73df'
down_revision = 'a1c4e77b90d2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sale_orders',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('administrator_id', sa.Integer(), nullable=False),
        sa.Column('total_amount', sa.Integer(), nullable=False),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.CheckConstraint('total_amount >= 0', name='sale_orders_total_non_negative'),
        sa.ForeignKeyConstraint(
            ['administrator_id'],
            ['administrators.id'],
            ondelete='RESTRICT',
            onupdate='CASCADE',
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_sale_orders_created_at', 'sale_orders', ['created_at'])
    op.create_index('idx_sale_orders_administrator_id', 'sale_orders', ['administrator_id'])

    op.add_column('sales', sa.Column('sale_order_id', sa.Integer(), nullable=True))
    op.add_column('sales', sa.Column('unit_price', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_sales_sale_order_id',
        'sales',
        'sale_orders',
        ['sale_order_id'],
        ['id'],
        ondelete='RESTRICT',
        onupdate='CASCADE',
    )
    op.create_check_constraint(
        'sales_unit_price_non_negative', 'sales', 'unit_price IS NULL OR unit_price >= 0'
    )
    op.create_index('idx_sales_sale_order_id', 'sales', ['sale_order_id'])


def downgrade():
    op.drop_index('idx_sales_sale_order_id', table_name='sales')
    op.drop_constraint('sales_unit_price_non_negative', 'sales', type_='check')
    op.drop_constraint('fk_sales_sale_order_id', 'sales', type_='foreignkey')
    op.drop_column('sales', 'unit_price')
    op.drop_column('sales', 'sale_order_id')

    op.drop_index('idx_sale_orders_administrator_id', table_name='sale_orders')
    op.drop_index('idx_sale_orders_created_at', table_name='sale_orders')
    op.drop_table('sale_orders')
