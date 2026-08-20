"""remove_colors

Esquema de la tanda "sacar colores" (pedido del administrador, 19/08/2026).
Migracion de ESQUEMA unicamente (04_BASE_DATOS.md Sec.11.2 regla 3), corre
despues de la de datos add2a263a249, que ya dejo sin duplicados el par
(product_id, talle) antes de que este archivo agregue la restriccion unica
que los prohibe.

Retira `colors`, `product_colors` y `variants.color_id`: RN-14 y RN-16 se
retiran, RN-13 pasa a definir la variante como Producto + Talle unicamente.
`uq_variants_product_color_size` se reemplaza por `uq_variants_product_size`.

No hay otra tabla que referencie `colors.id` aparte de `product_colors` y
`variants.color_id` (verificado: no hay `cart_items` ni `order_items`, el
carrito es enteramente del lado del cliente) -- se puede borrar limpio.

Reversibilidad (04 Sec.11.2 regla 2): el downgrade recrea el esquema
(tablas, columna, indices) pero **no los datos** -- `colors` y
`product_colors` vuelven a existir vacias, y `variants.color_id` vuelve
nulo en todas las filas. No es recuperable porque la migracion de datos que
antecede a esta ya fusiono y borro las filas que distinguia el color
(add2a263a249, tampoco reversible, ver su propio docstring).

Revision ID: d20b530ad8a6
Revises: add2a263a249
Create Date: 2026-08-19 22:13:22.033743

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd20b530ad8a6'
down_revision = 'add2a263a249'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('variants', schema=None) as batch_op:
        batch_op.drop_index('uq_variants_product_color_size', postgresql_where=sa.text('deleted_at IS NULL'))
        batch_op.drop_index('idx_variants_color_id')
        batch_op.drop_constraint('fk_variants_color_id_colors', type_='foreignkey')
        batch_op.drop_column('color_id')

    op.drop_table('product_colors')
    op.drop_table('colors')

    with op.batch_alter_table('variants', schema=None) as batch_op:
        batch_op.create_index(
            'uq_variants_product_size',
            ['product_id', sa.text('COALESCE(size_id, 0)')],
            unique=True,
            postgresql_where=sa.text('deleted_at IS NULL'),
        )


def downgrade():
    with op.batch_alter_table('variants', schema=None) as batch_op:
        batch_op.drop_index('uq_variants_product_size', postgresql_where=sa.text('deleted_at IS NULL'))

    op.create_table(
        'colors',
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('slug', sa.String(length=50), nullable=False),
        sa.Column('hex_code', sa.String(length=7), nullable=True),
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_colors')),
        sa.UniqueConstraint('slug', name=op.f('uq_colors_slug')),
    )

    op.create_table(
        'product_colors',
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('color_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['color_id'], ['colors.id'], name=op.f('fk_product_colors_color_id_colors'), onupdate='CASCADE', ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], name=op.f('fk_product_colors_product_id_products'), onupdate='CASCADE', ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('product_id', 'color_id', name=op.f('pk_product_colors')),
    )

    with op.batch_alter_table('variants', schema=None) as batch_op:
        batch_op.add_column(sa.Column('color_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_variants_color_id_colors', 'colors', ['color_id'], ['id'], onupdate='CASCADE', ondelete='RESTRICT'
        )
        batch_op.create_index('idx_variants_color_id', ['color_id'], unique=False)
        batch_op.create_index(
            'uq_variants_product_color_size',
            ['product_id', sa.text('COALESCE(color_id, 0)'), sa.text('COALESCE(size_id, 0)')],
            unique=True,
            postgresql_where=sa.text('deleted_at IS NULL'),
        )
