"""seed_genders_and_size_types

Datos semilla obligatorios de 04_BASE_DATOS.md §11.3: los valores cerrados que el
sistema necesita para arrancar en un entorno nuevo.

- genders:    men, women, unisex, boys, girls          (S-06, 00.3 §9.2)
- size_types: footwear_numeric, apparel_alpha, one_size (S-07, 00.3 §9.4)

`name` y `slug` guardan el mismo valor almacenado: 00.3 §9 establece que el valor
almacenado nunca se muestra al cliente y que la traduccion al espanol ocurre en la
capa de presentacion.

No se siembran marcas, categorias, deportes, colores ni talles: son datos
comerciales del negocio (PA-10, §11.3).

Migracion de datos, separada de la de esquema (§11.2, regla 3).
Reversible: downgrade() elimina exactamente las filas sembradas.

Depende de: 85f7b1aa1535_create_initial_schema.py

Revision ID: 9a1c4e77b2d0
Revises: 85f7b1aa1535
Create Date: 2026-08-09

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = '9a1c4e77b2d0'
down_revision = '85f7b1aa1535'
branch_labels = None
depends_on = None

GENDERS = ('men', 'women', 'unisex', 'boys', 'girls')
SIZE_TYPES = ('footwear_numeric', 'apparel_alpha', 'one_size')


def _seed_table(table_name, values):
    table = sa.table(
        table_name,
        sa.column('name', sa.String),
        sa.column('slug', sa.String),
        sa.column('is_active', sa.Boolean),
    )
    op.bulk_insert(
        table,
        [{'name': value, 'slug': value, 'is_active': True} for value in values],
    )


def upgrade():
    _seed_table('genders', GENDERS)
    _seed_table('size_types', SIZE_TYPES)


def downgrade():
    for table_name, values in (('size_types', SIZE_TYPES), ('genders', GENDERS)):
        op.execute(
            sa.text(f"DELETE FROM {table_name} WHERE slug IN :slugs").bindparams(
                sa.bindparam('slugs', value=tuple(values), expanding=True)
            )
        )
