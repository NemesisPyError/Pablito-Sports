"""Fixtures del panel administrativo (11_TESTING.md §12.6).

Aíslan al administrador de prueba de las filas semilla y ofrecen una vista de la
base **fuera** de la sesión de la aplicación: la única forma de distinguir un
`flush()` de un `commit()` es preguntarlo desde otra conexión.
"""

import os
import secrets

from sqlalchemy import create_engine, text

from app.core.security.password import hash_password
from app.extensions import db
from app.models import Administrator

TEST_ADMIN_USERNAME = "audit-tester"
TEST_ADMIN_EMAIL = "audit-tester@pablitosports.test"
# Se genera en cada ejecución: 03_SEGURIDAD.md §18.2 prohíbe versionar
# contraseñas, y una constante literal aquí sería una contraseña versionada
# aunque solo sirviera para pruebas. El valor queda disponible en memoria para
# los tests que necesiten pasar por el login.
TEST_ADMIN_PASSWORD = secrets.token_urlsafe(24)


def create_test_administrator(role: str = "super_administrator") -> int:
    """Crea el administrador de pruebas y devuelve su identificador."""
    delete_test_administrator()
    administrator = Administrator(
        username=TEST_ADMIN_USERNAME,
        email=TEST_ADMIN_EMAIL,
        password_hash=hash_password(TEST_ADMIN_PASSWORD),
        role=role,
        is_active=True,
    )
    db.session.add(administrator)
    db.session.commit()
    return administrator.id


def delete_test_administrator() -> None:
    """Limpieza de prueba: `audit_logs` primero, por la FK con `ON DELETE RESTRICT`."""
    db.session.execute(
        text(
            "DELETE FROM audit_logs WHERE administrator_id IN "
            "(SELECT id FROM administrators WHERE username = :username)"
        ),
        {"username": TEST_ADMIN_USERNAME},
    )
    db.session.execute(
        text("DELETE FROM administrators WHERE username = :username"),
        {"username": TEST_ADMIN_USERNAME},
    )
    db.session.commit()


def outside_engine():
    """Conexión independiente de la sesión de la aplicación.

    Solo ve lo que ya está confirmado, así que distingue un `flush()` sin commit
    de una transacción realmente cerrada (10_BACKEND.md §14.1).
    """
    return create_engine(os.environ["TEST_DATABASE_URL"])
