"""create_category_genders_table

Sexos a los que aplica una categoria (RN-83, v2.10.0, pedido explicito del
administrador: ordenar el menu de la tienda desde el panel en vez de con una
lista de slugs excluidos escrita en el codigo del frontend).

Mismo patron que `product_genders`: clave primaria compuesta, sin columna
propia y sin marcas de tiempo, porque la fila no tiene atributo alguno.

Migracion de ESQUEMA unicamente (04_BASE_DATOS.md Sec.11.2 regla 3): no toca
datos. **No hay backfill a proposito** (AD-41): una categoria sin filas no
tiene restriccion y sigue apareciendo en los tres ejes de sexo, que es
exactamente como se comportaba el menu antes de esta migracion. Asi el
despliegue no cambia nada de lo que el cliente ve hasta que el administrador
empiece a destildar sexos.

Revision ID: c5b1f0a72e14
Revises: e6a2b91c73df
Create Date: 2026-09-10 09:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5b1f0a72e14'
down_revision = 'e6a2b91c73df'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'category_genders',
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('gender_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ['category_id'], ['categories.id'],
            name=op.f('fk_category_genders_category_id_categories'),
            onupdate='CASCADE', ondelete='RESTRICT',
        ),
        sa.ForeignKeyConstraint(
            ['gender_id'], ['genders.id'],
            name=op.f('fk_category_genders_gender_id_genders'),
            onupdate='CASCADE', ondelete='RESTRICT',
        ),
        sa.PrimaryKeyConstraint('category_id', 'gender_id', name=op.f('pk_category_genders')),
    )


def downgrade():
    op.drop_table('category_genders')
