"""create_product_genders_table

Esquema para Sexo como relacion N:M (RN-09, v2.9.0, pedido explicito del
administrador: un producto puede pertenecer a varios sexos). Hasta aqui
`products.gender_id` era una FK simple. Se agrega la tabla intermedia,
mismo patron que `product_sports`/`product_categories`/`product_sizes`
(sin columna propia, clave primaria compuesta).

Migracion de ESQUEMA unicamente (04_BASE_DATOS.md Sec.11.2 regla 3): no
toca datos. `products.gender_id` sigue existiendo tras esta migracion; el
backfill de datos y el drop de la columna van en las dos migraciones
siguientes.

Revision ID: cdc83d47fa5e
Revises: f4d4c1fe2de3
Create Date: 2026-08-24 18:47:10.752180

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cdc83d47fa5e'
down_revision = 'f4d4c1fe2de3'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'product_genders',
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('gender_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ['product_id'], ['products.id'],
            name=op.f('fk_product_genders_product_id_products'),
            onupdate='CASCADE', ondelete='RESTRICT',
        ),
        sa.ForeignKeyConstraint(
            ['gender_id'], ['genders.id'],
            name=op.f('fk_product_genders_gender_id_genders'),
            onupdate='CASCADE', ondelete='RESTRICT',
        ),
        sa.PrimaryKeyConstraint('product_id', 'gender_id', name=op.f('pk_product_genders')),
    )


def downgrade():
    op.drop_table('product_genders')
