"""bank_description

Nota interna del panel para el banco de Superdescuentos (v1.6.0, pedido
explícito del usuario): `banks.description`, `TEXT NULL`, sin tope de
longitud propio — mismo criterio que `promotions.description`. No es un dato
que la tarjeta pública muestre (`BankDTO` sigue con solo `name`,
`discount_percentage`, `image_url`); es contexto para el administrador.

Migración de ESQUEMA únicamente: nace NULL en todas las filas existentes, sin
backfill.

Revision ID: 766befdcc1ed
Revises: f8c3e02d1a4b
Create Date: 2026-09-22 22:02:12.524456

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '766befdcc1ed'
down_revision = 'f8c3e02d1a4b'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('banks', sa.Column('description', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('banks', 'description')
