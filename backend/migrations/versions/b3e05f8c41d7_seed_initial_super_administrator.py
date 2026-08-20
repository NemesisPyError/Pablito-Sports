"""seed_initial_super_administrator

Semilla obligatoria de 04_BASE_DATOS.md §11.3: el superadministrador inicial que
el sistema necesita para poder administrarse en un entorno nuevo.

La contraseña NO viaja en el código (03_SEGURIDAD.md §18.2). Se toma de la
variable de entorno `ADMIN_INITIAL_PASSWORD`; si falta, la migración falla y no
crea el usuario, en lugar de sembrar una credencial conocida.

El hash es bcrypt con coste >= 12 (§5.5). Solo se almacena el hash.

Reversible: downgrade() elimina exactamente la fila sembrada.

Depende de: 9a1c4e77b2d0_seed_genders_and_size_types.py

Revision ID: b3e05f8c41d7
Revises: 9a1c4e77b2d0
Create Date: 2026-08-09

"""

import os

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'b3e05f8c41d7'
down_revision = '9a1c4e77b2d0'
branch_labels = None
depends_on = None

USERNAME = os.environ.get('ADMIN_INITIAL_USERNAME', 'admin')
EMAIL = os.environ.get('ADMIN_INITIAL_EMAIL', 'admin@pablitosports.local')


def upgrade():
    password = os.environ.get('ADMIN_INITIAL_PASSWORD')
    if not password:
        raise RuntimeError(
            'ADMIN_INITIAL_PASSWORD no está definida. 03_SEGURIDAD.md §18.2 prohíbe '
            'versionar credenciales, así que la contraseña del superadministrador '
            'inicial debe inyectarse por variable de entorno.'
        )

    # §5.5: política mínima de 8 caracteres.
    if len(password) < 8:
        raise RuntimeError('ADMIN_INITIAL_PASSWORD debe tener al menos 8 caracteres (§5.5).')

    import bcrypt

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode()

    administrators = sa.table(
        'administrators',
        sa.column('username', sa.String),
        sa.column('email', sa.String),
        sa.column('password_hash', sa.String),
        sa.column('role', sa.String),
        sa.column('is_active', sa.Boolean),
    )
    op.bulk_insert(
        administrators,
        [
            {
                'username': USERNAME,
                'email': EMAIL,
                'password_hash': password_hash,
                # RN-67
                'role': 'super_administrator',
                'is_active': True,
            }
        ],
    )


def downgrade():
    op.execute(
        sa.text('DELETE FROM administrators WHERE username = :username').bindparams(
            username=USERNAME
        )
    )
