"""Frontera transaccional de promociones (10_BACKEND.md §14.1, `CONS-05`).

Sin petición HTTP no interviene `Flask-Session` —que confirma la sesión de la
aplicación al guardar la del usuario— ni el manejador global de errores, que
hace `rollback` de red. Lo único capaz de cerrar o revertir aquí es
`@transactional`, así que estos son los tests que lo demuestran.
"""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text

from app.core.audit import AuditService
from app.extensions import db
from app.schemas.promotion_schemas import PromotionInput
from app.services.admin_promotion_service import AdminPromotionService

PREFIJO = "tx-promo"

AHORA = datetime(2026, 6, 15, 12, 0, 0, tzinfo=UTC)
AYER = AHORA - timedelta(days=1)
MANANA = AHORA + timedelta(days=1)


@pytest.fixture
def marca(schema_app):
    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type = 'promotion' AND entity_id IN "
                "(SELECT id FROM promotions WHERE name LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        db.session.execute(text("DELETE FROM promotions WHERE name LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE :p"), {"p": f"{PREFIJO}%"})
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text("INSERT INTO brands (name, slug, is_active) VALUES ('Tx Promo', :s, true)"),
            {"s": f"{PREFIJO}-marca"},
        )
        db.session.commit()
        identificador = db.session.execute(
            text("SELECT id FROM brands WHERE slug = :s"), {"s": f"{PREFIJO}-marca"}
        ).scalar_one()
        try:
            yield identificador
        finally:
            limpiar()


def _entrada(brand_id: int, sufijo: str = "a") -> PromotionInput:
    return PromotionInput(
        name=f"{PREFIJO}-{sufijo}",
        description=None,
        discount_percentage=25,
        starts_at=AYER,
        ends_at=MANANA,
        is_active=True,
        product_id=None,
        category_id=None,
        brand_id=brand_id,
    )


def _confirmadas(engine, sufijo: str = "a") -> int:
    with engine.connect() as conexion:
        return conexion.execute(
            text("SELECT count(*) FROM promotions WHERE name = :n"), {"n": f"{PREFIJO}-{sufijo}"}
        ).scalar_one()


def _auditoria(engine, administrator_id: int) -> int:
    with engine.connect() as conexion:
        return conexion.execute(
            text(
                "SELECT count(*) FROM audit_logs WHERE administrator_id = :a "
                "AND entity_type = 'promotion'"
            ),
            {"a": administrator_id},
        ).scalar_one()


def test_creacion_correcta_confirma_promocion_y_auditoria(
    schema_app, administrator_id, marca, outside
):
    """Sin `@transactional` nada de esto quedaría confirmado."""
    with schema_app.app_context():
        AdminPromotionService.create(_entrada(marca), administrator_id=administrator_id)

    assert _confirmadas(outside) == 1
    assert _auditoria(outside, administrator_id) == 1


def test_excepcion_tras_escribir_revierte_promocion_y_auditoria(
    schema_app, administrator_id, marca, outside, monkeypatch
):
    def explota(promocion):
        raise RuntimeError("fallo simulado despues de escribir")

    monkeypatch.setattr("app.services.admin_promotion_service.promotion_to_dto", explota)

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminPromotionService.create(_entrada(marca), administrator_id=administrator_id)

        # Reproduce el commit ajeno de Flask-Session.
        db.session.commit()

    assert _confirmadas(outside) == 0
    assert _auditoria(outside, administrator_id) == 0


def test_fallo_de_auditoria_revierte_la_creacion(
    schema_app, administrator_id, marca, outside, monkeypatch
):
    """`CONS-05`: promoción y auditoría caen juntas."""

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            AdminPromotionService.create(_entrada(marca), administrator_id=administrator_id)
        db.session.commit()

    assert _confirmadas(outside) == 0


def test_el_borrado_logico_se_confirma(schema_app, administrator_id, marca, outside):
    with schema_app.app_context():
        creada = AdminPromotionService.create(_entrada(marca), administrator_id=administrator_id)
        AdminPromotionService.delete(creada.id, administrator_id=administrator_id)

    with outside.connect() as conexion:
        eliminada = conexion.execute(
            text("SELECT deleted_at FROM promotions WHERE id = :i"), {"i": creada.id}
        ).scalar_one()

    assert eliminada is not None
    assert _auditoria(outside, administrator_id) == 2  # create + delete
