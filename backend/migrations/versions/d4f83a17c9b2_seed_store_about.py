"""seed_store_about

Texto inicial de "Nuestra historia" (04_BASE_DATOS.md §9.2.14, v1.1.0).

El contenido lo redacto el dueno de la tienda. Se carga como **dato editable
desde el panel** y no como texto escrito dentro del codigo: esa es la
diferencia entre contenido que el administrador controla y contenido que hay
que ir a buscar a un archivo fuente (`UDS-09`).

Solo escribe donde `about_title` esta vacio. Si el administrador ya cargo su
propio texto, esta migracion no lo pisa: una migracion de datos que sobrescribe
contenido editado es una perdida de trabajo, no una actualizacion.

No siembra `about_image_path`: no hay ninguna foto que sembrar, y una ruta
apuntando a un archivo inexistente es exactamente la deuda de datos que ya
arrastran algunas filas semilla de imagenes.

Migracion de datos, separada de la de esquema (§11.2, regla 3).
Reversible: downgrade() limpia solo las filas que esta migracion escribio.

Depende de: c7d21e93f4a8_home_administrable_schema.py

Revision ID: d4f83a17c9b2
Revises: c7d21e93f4a8
Create Date: 2026-08-13

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'd4f83a17c9b2'
down_revision = 'c7d21e93f4a8'
branch_labels = None
depends_on = None

ABOUT_TITLE = 'Más que una tienda, una comunidad deportiva'

ABOUT_TEXT = (
    'Pablito Sports nació con una idea simple: acercar calzado, indumentaria y '
    'accesorios deportivos de calidad a quienes viven el deporte todos los días. '
    'Desde nuestros comienzos trabajamos con atención personalizada y marcas '
    'reconocidas, acompañando a jugadores, entrenadores y familias de toda la región.'
)


def upgrade():
    op.execute(
        sa.text(
            'UPDATE store_settings '
            'SET about_title = :title, about_text = :text '
            "WHERE about_title IS NULL OR about_title = ''"
        ).bindparams(title=ABOUT_TITLE, text=ABOUT_TEXT)
    )


def downgrade():
    op.execute(
        sa.text(
            'UPDATE store_settings '
            'SET about_title = NULL, about_text = NULL '
            'WHERE about_title = :title'
        ).bindparams(title=ABOUT_TITLE)
    )
