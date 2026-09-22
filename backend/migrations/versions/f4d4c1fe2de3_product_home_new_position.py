"""product_home_new_position

Novedades como seleccion editorial de productos (pedido del administrador,
24/08/2026), no como banners ni como el toggle `is_new` (04_BASE_DATOS.md
Sec.9.2.1).

Agrega `products.home_new_position`: NULL = el producto no esta en
Novedades, un entero marca a la vez que esta y en que lugar de la fila
(mismo patron que `brands.home_position` de `c7d21e93f4a8`). Nace NULL en
todas las filas existentes -- ningun producto queda en Novedades por
default, la seleccion es enteramente manual desde el panel.

Migracion de ESQUEMA unicamente (04 Sec.11.2 regla 3): no toca datos.

Revision ID: f4d4c1fe2de3
Revises: d20b530ad8a6
Create Date: 2026-08-24 13:58:58.472113

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f4d4c1fe2de3'
down_revision = 'd20b530ad8a6'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('home_new_position', sa.Integer(), nullable=True))
    op.create_check_constraint(
        'home_new_position_valid', 'products', 'home_new_position IS NULL OR home_new_position >= 0'
    )


def downgrade():
    op.drop_constraint('home_new_position_valid', 'products', type_='check')
    op.drop_column('products', 'home_new_position')
