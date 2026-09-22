"""brand_show_in_strip

La franja deslizante de marcas bajo la navegacion (`BrandStrip`,
09_COMPONENTES.md Sec.9.8 `BrandRail`) mostraba TODAS las marcas activas, sin
forma de elegir cuales. El administrador pidio poder decidirlo marca por marca.

Agrega `brands.show_in_strip`. Es independiente de `brands.home_position`, que
resuelve otra cosa (si la marca tiene bloque propio con collage en la portada,
Sec.7.2c): una marca puede estar en la franja sin bloque, y al reves.

Nace TRUE en todas las filas existentes -- hasta ahora la franja las mostraba a
todas, asi que el default preserva exactamente lo que se ve hoy y el
administrador va quitando las que no quiera (decision explicita del usuario
frente a la alternativa de arrancar con la franja vacia).

Migracion de ESQUEMA unicamente (04 Sec.11.2 regla 3): el server_default
rellena las filas existentes, no hay UPDATE de datos.

Revision ID: a1c4e77b90d2
Revises: b99b11955f25
Create Date: 2026-09-02 19:02:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1c4e77b90d2'
down_revision = 'b99b11955f25'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'brands',
        sa.Column('show_in_strip', sa.Boolean(), nullable=False, server_default=sa.text('true')),
    )


def downgrade():
    op.drop_column('brands', 'show_in_strip')
