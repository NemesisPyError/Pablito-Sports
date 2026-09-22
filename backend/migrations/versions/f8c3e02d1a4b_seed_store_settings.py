"""seed_store_settings

Semilla obligatoria de 04_BASE_DATOS.md §9.2.14: la fila única `id = 1` de
`store_settings` que el sistema exige desde el primer arranque.

El diseño asume que esa fila existe (§9.2.14 "fila única, id = 1"): por ejemplo
`d4f83a17c9b2_seed_store_about` hace `UPDATE store_settings` presuponiéndola, y
`GET /store/settings` responde 404 mientras no exista — lo que dejaba la tienda
pública inutilizable en un entorno nuevo: el panel PUT solo actualiza, nunca
inserta.

Solo se siembran las columnas `NOT NULL` (05_API.md §9.2.14) con valores
neutros configurables por variable de entorno; el resto —dirección, horarios,
redes, sección "Sobre nosotros"— queda `NULL` para que el administrador las
complete desde el panel, igual que en el fixture de tests.

Reversible: downgrade() elimina exactamente la fila sembrada.

Depende de: a3f6c9d21b47_promotion_scope_allows_all_products.py

Revision ID: f8c3e02d1a4b
Revises: a3f6c9d21b47
Create Date: 2026-09-22

"""
import os

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'f8c3e02d1a4b'
down_revision = 'a3f6c9d21b47'
branch_labels = None
depends_on = None

STORE_NAME = os.environ.get('INITIAL_STORE_NAME', 'Pablito Sports')
WHATSAPP_NUMBER = os.environ.get('INITIAL_WHATSAPP_NUMBER', '+595000000000')

# Valores por defecto del servidor (backend/app/core/utils/whatsapp_defaults.py).
MESSAGE_TEMPLATE = """Hola {{tienda}}! 👋
Quiero consultar por estos productos:

{{items}}
--------------------------------
Total estimado: {{total}}
(Precios sujetos a confirmación)

Consulta N.º: {{codigo_consulta}}"""

ITEM_TEMPLATE = """{{numero}}) {{producto}}
   Marca: {{marca}} | Talle: {{talle}}
   Cantidad: {{cantidad}} x {{precio_unitario}} = {{subtotal}}
   Estado: {{disponibilidad}}"""


def upgrade():
    table = sa.table(
        'store_settings',
        sa.column('id', sa.Integer),
        sa.column('store_name', sa.String),
        sa.column('whatsapp_number', sa.String),
        sa.column('message_template', sa.Text),
        sa.column('item_template', sa.Text),
    )
    op.bulk_insert(
        table,
        [
            {
                'id': 1,
                'store_name': STORE_NAME,
                'whatsapp_number': WHATSAPP_NUMBER,
                'message_template': MESSAGE_TEMPLATE,
                'item_template': ITEM_TEMPLATE,
            }
        ],
    )


def downgrade():
    op.execute(
        sa.text('DELETE FROM store_settings WHERE id = :id').bindparams(id=1)
    )