"""Escritura administrativa a nivel de servicio (CONS-05, 10_BACKEND.md §14.3).

A diferencia de los tests de `tests/integration/api/test_admin_audit.py`, aquí no
hay petición HTTP: no interviene `Flask-Session` —que confirma la sesión de la
aplicación al guardar la del usuario— ni el manejador global de errores. Lo
único que puede cerrar o revertir la transacción es `@transactional`, así que
estos tests aíslan la frontera transaccional del servicio.
"""

import pytest
from sqlalchemy import text

from app.core.audit import AuditService
from app.core.exceptions import BusinessRuleError
from app.extensions import db
from app.services.admin_classification_service import AdminBrandService

SLUG = "svc-audit-marca"


def _brands(engine, slug: str = SLUG) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT count(*) FROM brands WHERE slug = :slug"), {"slug": slug}
        ).scalar_one()


def _audit_count(engine, administrator_id: int) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT count(*) FROM audit_logs WHERE administrator_id = :administrator_id"),
            {"administrator_id": administrator_id},
        ).scalar_one()


@pytest.fixture
def brands_cleanup(schema_app):
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'svc-audit-%'"))
        db.session.commit()
        yield
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'svc-audit-%'"))
        db.session.commit()


def test_crear_marca_confirma_entidad_y_auditoria_sin_peticion_http(
    schema_app, administrator_id, brands_cleanup, outside
):
    with schema_app.app_context():
        AdminBrandService.create(
            {"name": "Servicio", "slug": SLUG}, administrator_id=administrator_id
        )

    assert _brands(outside) == 1
    assert _audit_count(outside, administrator_id) == 1


def test_excepcion_en_el_servicio_revierte_entidad_y_auditoria(
    schema_app, administrator_id, brands_cleanup, outside, monkeypatch
):
    def explota(cls, entity):
        raise RuntimeError("fallo simulado despues de escribir")

    monkeypatch.setattr(AdminBrandService, "_to_admin_dto", classmethod(explota))

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminBrandService.create(
                {"name": "Servicio", "slug": SLUG}, administrator_id=administrator_id
            )

        # Reproduce el commit ajeno de Flask-Session: si el rollback no hubiera
        # ocurrido, aquí se confirmaría la escritura a medias.
        db.session.commit()

    assert _brands(outside) == 0
    assert _audit_count(outside, administrator_id) == 0


def test_fallo_de_auditoria_revierte_la_escritura(
    schema_app, administrator_id, brands_cleanup, outside, monkeypatch
):
    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminBrandService.create(
                {"name": "Servicio", "slug": SLUG}, administrator_id=administrator_id
            )

        # Reproduce el commit ajeno de Flask-Session: si el rollback no hubiera
        # ocurrido, aquí se confirmaría la escritura a medias.
        db.session.commit()

    assert _brands(outside) == 0
    assert _audit_count(outside, administrator_id) == 0


def test_regla_de_negocio_deja_los_datos_originales_intactos(
    schema_app, administrator_id, brands_cleanup, outside
):
    """AD-19/RN-79. La operación rechazada no altera lo ya confirmado."""
    with schema_app.app_context():
        AdminBrandService.create(
            {"name": "Servicio", "slug": SLUG}, administrator_id=administrator_id
        )

        with pytest.raises(BusinessRuleError):
            AdminBrandService.create(
                {"name": "Duplicada", "slug": SLUG}, administrator_id=administrator_id
            )

    assert _brands(outside) == 1
    assert _audit_count(outside, administrator_id) == 1
