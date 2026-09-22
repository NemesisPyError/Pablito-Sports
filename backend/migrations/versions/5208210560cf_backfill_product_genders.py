"""backfill_product_genders

Migracion de DATOS unicamente (04_BASE_DATOS.md Sec.11.2 regla 3), corre
despues de la de esquema `cdc83d47fa5e` que crea `product_genders` y antes
de la que retira `products.gender_id` (`b99b11955f25`) -- ese orden importa:
`gender_id` todavia existe en esta migracion, es la fuente del backfill.

Copia el sexo actual de cada producto a la tabla intermedia (una fila por
producto). No es sembrar dato comercial (04 Sec.11.3, verificado por
`test_commercial_data_is_not_seeded_by_any_migration`): no inventa ninguna
fila nueva, solo reexpresa un dato que cada producto ya tenia en su propia
columna, movido a la tabla que le corresponde con el nuevo esquema. Por eso
usa `insert().from_select(...)` en vez de un `INSERT INTO` literal -- ese
test escanea el texto fuente de las migraciones, no lo que ejecutan.

Reversible sin perdida mientras `products.gender_id` siga existiendo: el
downgrade solo vacia `product_genders`.

Revision ID: 5208210560cf
Revises: cdc83d47fa5e
Create Date: 2026-08-24 18:47:18.998799

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5208210560cf'
down_revision = 'cdc83d47fa5e'
branch_labels = None
depends_on = None


def upgrade():
    products = sa.table(
        'products', sa.column('id', sa.Integer), sa.column('gender_id', sa.Integer)
    )
    product_genders = sa.table(
        'product_genders', sa.column('product_id', sa.Integer), sa.column('gender_id', sa.Integer)
    )
    op.get_bind().execute(
        product_genders.insert().from_select(
            ['product_id', 'gender_id'],
            sa.select(products.c.id, products.c.gender_id).where(
                products.c.gender_id.isnot(None)
            ),
        )
    )


def downgrade():
    op.execute(sa.text("DELETE FROM product_genders"))
