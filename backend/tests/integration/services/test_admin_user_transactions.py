"""Frontera transaccional de usuarios (10_BACKEND.md §14.1, `CONS-05`).

Sin petición HTTP no interviene `Flask-Session` —que confirma la sesión de la
aplicación al guardar la del usuario— ni el manejador global de errores, que
hace `rollback` de red. Lo único capaz de cerrar o revertir aquí es
`@transactional`, así que estos tests son los que demuestran que el decorador
está haciendo su trabajo: los de `tests/integration/api/test_admin_users.py`
pasan igual sin él.
"""

import secrets

import pytest
from sqlalchemy import text

from app.core.audit import AuditService
from app.core.exceptions import BusinessRuleError
from app.extensions import db
from app.schemas.administrator_schemas import AdministratorInput
from app.services.admin_user_service import AdminUserService

PREFIJO = "tx-users"
PASSWORD = f"pw-{secrets.token_urlsafe(16)}"


def _entrada(sufijo: str = "nuevo", **overrides) -> AdministratorInput:
    datos = {
        "username": f"{PREFIJO}-{sufijo}",
        "email": f"{PREFIJO}-{sufijo}@pablitosports.test",
        "role": "administrator",
        "is_active": True,
        "password": PASSWORD,
    }
    datos.update(overrides)
    return AdministratorInput(**datos)


def _confirmados(engine, sufijo: str = "nuevo") -> int:
    with engine.connect() as conexion:
        return conexion.execute(
            text("SELECT count(*) FROM administrators WHERE username = :u"),
            {"u": f"{PREFIJO}-{sufijo}"},
        ).scalar_one()


def _auditoria(engine, administrator_id: int) -> int:
    with engine.connect() as conexion:
        return conexion.execute(
            text(
                "SELECT count(*) FROM audit_logs WHERE administrator_id = :a "
                "AND entity_type = 'administrator'"
            ),
            {"a": administrator_id},
        ).scalar_one()


@pytest.fixture
def limpieza(schema_app):
    def limpiar():
        db.session.execute(
            db.text(
                "DELETE FROM audit_logs WHERE entity_type = 'administrator' AND entity_id IN "
                "(SELECT id FROM administrators WHERE username LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        db.session.execute(
            db.text("DELETE FROM administrators WHERE username LIKE :p"), {"p": f"{PREFIJO}%"}
        )
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        yield
        limpiar()


def test_creacion_correcta_confirma_usuario_y_auditoria(
    schema_app, administrator_id, limpieza, outside
):
    """Sin `@transactional` nada de esto quedaría confirmado."""
    with schema_app.app_context():
        AdminUserService.create(_entrada(), administrator_id=administrator_id)

    assert _confirmados(outside) == 1
    assert _auditoria(outside, administrator_id) == 1


def test_excepcion_tras_escribir_revierte_usuario_y_auditoria(
    schema_app, administrator_id, limpieza, outside, monkeypatch
):
    def explota(entrada):
        raise RuntimeError("fallo simulado despues de escribir")

    monkeypatch.setattr(
        "app.services.admin_user_service.administrator_to_dto", lambda entrada: explota(entrada)
    )

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminUserService.create(_entrada(), administrator_id=administrator_id)

        # Reproduce el commit ajeno de Flask-Session: sin rollback, aquí se
        # confirmaría la escritura a medias.
        db.session.commit()

    assert _confirmados(outside) == 0
    assert _auditoria(outside, administrator_id) == 0


def test_fallo_de_auditoria_revierte_la_creacion(
    schema_app, administrator_id, limpieza, outside, monkeypatch
):
    """`CONS-05`: usuario y auditoría caen juntos."""

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminUserService.create(_entrada(), administrator_id=administrator_id)
        db.session.commit()

    assert _confirmados(outside) == 0


def test_regla_de_negocio_no_deja_escritura_parcial(
    schema_app, administrator_id, limpieza, outside
):
    """`RN-72` corta la operación; nada se escribe a medias."""
    with schema_app.app_context():
        creado = AdminUserService.create(_entrada(), administrator_id=administrator_id)

        with pytest.raises(BusinessRuleError) as excepcion:
            AdminUserService.delete(creado.id, administrator_id=creado.id)
        assert excepcion.value.rule == "RN-72"

        db.session.commit()

    with outside.connect() as conexion:
        eliminado = conexion.execute(
            text("SELECT deleted_at FROM administrators WHERE username = :u"),
            {"u": f"{PREFIJO}-nuevo"},
        ).scalar_one()
    assert eliminado is None
    assert _auditoria(outside, administrator_id) == 1  # solo el `create`


def test_el_cambio_de_contrasena_confirma_hash_y_auditoria(
    schema_app, administrator_id, limpieza, outside
):
    from app.core.security.password import verify_password
    from app.schemas.administrator_schemas import PasswordChangeInput

    nueva = f"pw-{secrets.token_urlsafe(16)}"
    with schema_app.app_context():
        creado = AdminUserService.create(_entrada(), administrator_id=administrator_id)
        AdminUserService.change_password(
            creado.id,
            PasswordChangeInput(current_password="", new_password=nueva),
            administrator_id=administrator_id,
            is_super_administrator=True,
        )

    with outside.connect() as conexion:
        almacenado = conexion.execute(
            text("SELECT password_hash FROM administrators WHERE id = :i"), {"i": creado.id}
        ).scalar_one()

    assert verify_password(nueva, almacenado)
    assert _auditoria(outside, administrator_id) == 2  # create + update
