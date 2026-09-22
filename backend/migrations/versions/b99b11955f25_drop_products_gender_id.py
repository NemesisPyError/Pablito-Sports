"""drop_products_gender_id

Tanda "sexo multiple" (RN-09, v2.9.0, pedido explicito del administrador).
Migracion de ESQUEMA unicamente (04_BASE_DATOS.md Sec.11.2 regla 3), ultima
de la serie: corre despues del backfill `5208210560cf`, que ya copio cada
`gender_id` a `product_genders`. Retira la columna, su FK y su indice --
`products.genders` pasa a resolverse enteramente por la tabla intermedia.

Reversibilidad (04 Sec.11.2 regla 2): el downgrade recrea la columna
(nullable, para no romper con productos de mas de un sexo) y la rellena
con el menor `gender_id` de cada producto en `product_genders`. Si para
entonces algun producto ya tiene mas de un sexo cargado, el downgrade
conserva solo uno -- no hay forma de volver a "un sexo por producto" sin
elegir cual se descarta.

Revision ID: b99b11955f25
Revises: 5208210560cf
Create Date: 2026-08-24 18:50:03.428216

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b99b11955f25'
down_revision = '5208210560cf'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_index('idx_products_gender_id')
        batch_op.drop_constraint('fk_products_gender_id_genders', type_='foreignkey')
        batch_op.drop_column('gender_id')


def downgrade():
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('gender_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_products_gender_id_genders', 'genders', ['gender_id'], ['id'],
            onupdate='CASCADE', ondelete='RESTRICT',
        )
        batch_op.create_index('idx_products_gender_id', ['gender_id'], unique=False)

    op.execute(
        "UPDATE products SET gender_id = ("
        "  SELECT MIN(gender_id) FROM product_genders WHERE product_genders.product_id = products.id"
        ")"
    )
