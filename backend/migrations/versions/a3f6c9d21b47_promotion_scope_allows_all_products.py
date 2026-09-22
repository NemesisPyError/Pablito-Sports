"""promotion_scope_allows_all_products

Relaja `scope_exclusive` (RN-36) de "exactamente uno" a "como máximo uno" de
{product_id, category_id, brand_id}. Con los tres NULL, la promoción aplica a
todos los productos (v1.6.0, pedido explícito del usuario) — antes ese estado
no era representable. `ProductRepository._best_promotion_percentage` ya suma
la rama correspondiente para que ese caso participe en el cálculo de precio.

Reversible: `downgrade()` vuelve a la restricción original ("= 1"). Si al
bajar existiera una promoción con los tres campos en NULL, la restricción
más estricta la rechazaría — no hay ninguna en el esquema base, y es
responsabilidad de quien opere el downgrade limpiarlas antes si las hubiera.

Revision ID: a3f6c9d21b47
Revises: e2db739a4c13
Create Date: 2026-09-22 14:05:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = 'a3f6c9d21b47'
down_revision = 'e2db739a4c13'
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint('scope_exclusive', 'promotions', type_='check')
    op.create_check_constraint(
        'scope_exclusive',
        'promotions',
        "(product_id IS NOT NULL)::int + (category_id IS NOT NULL)::int "
        "+ (brand_id IS NOT NULL)::int <= 1",
    )


def downgrade():
    op.drop_constraint('scope_exclusive', 'promotions', type_='check')
    op.create_check_constraint(
        'scope_exclusive',
        'promotions',
        "(product_id IS NOT NULL)::int + (category_id IS NOT NULL)::int "
        "+ (brand_id IS NOT NULL)::int = 1",
    )
