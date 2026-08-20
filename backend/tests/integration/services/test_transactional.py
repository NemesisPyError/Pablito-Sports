"""Frontera transaccional explícita (10_BACKEND.md §14.1, §14.3; 11_TESTING.md §12.3).

Los asertos consultan una conexión ajena a la sesión de la aplicación: es la
única forma de comprobar que la transacción se cerró de verdad y no que los
cambios siguen pendientes en la sesión.
"""

import pytest
from sqlalchemy import text

from app.core.decorators import transactional
from app.extensions import db
from app.models import Brand

SLUG = "tx-marca-de-prueba"
NESTED_SLUG = "tx-marca-anidada"


def _committed(engine, slug: str) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT count(*) FROM brands WHERE slug = :slug"), {"slug": slug}
        ).scalar_one()


@pytest.fixture
def brands_cleanup(schema_app):
    """Retira las marcas de prueba antes y después, incluso si el test falla."""
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'tx-%'"))
        db.session.commit()
        yield
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'tx-%'"))
        db.session.commit()


@transactional
def _create_brand(slug: str):
    brand = Brand(name=slug, slug=slug, is_active=True)
    db.session.add(brand)
    db.session.flush()
    return brand.id


@transactional
def _create_brand_and_fail(slug: str):
    brand = Brand(name=slug, slug=slug, is_active=True)
    db.session.add(brand)
    db.session.flush()
    raise RuntimeError("fallo despues de escribir")


@transactional
def _create_two_brands_outer_fails():
    _create_brand(SLUG)
    _create_brand(NESTED_SLUG)
    raise RuntimeError("fallo en la operacion externa")


def test_transactional_operacion_correcta_confirma_la_transaccion(
    schema_app, brands_cleanup, outside
):
    with schema_app.app_context():
        _create_brand(SLUG)

    assert _committed(outside, SLUG) == 1


def test_transactional_excepcion_revierte_la_escritura(schema_app, brands_cleanup, outside):
    """El rollback descarta la escritura; un commit posterior no la resucita.

    El commit explícito de después reproduce lo que hace `Flask-Session` al
    guardar la sesión de usuario sobre la misma sesión de la aplicación: si el
    decorador se limitara a propagar la excepción, ese commit ajeno confirmaría
    la escritura a medias.
    """
    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            _create_brand_and_fail(SLUG)

        db.session.commit()

    assert _committed(outside, SLUG) == 0


def test_transactional_anidado_usa_una_sola_transaccion(schema_app, brands_cleanup, outside):
    """§14.1 regla 1: una operación de escritura, una unidad de trabajo.

    La llamada interna no confirma por su cuenta; si la externa falla, ambas
    escrituras desaparecen.
    """
    with schema_app.app_context():
        with pytest.raises(RuntimeError):
            _create_two_brands_outer_fails()

        db.session.commit()

    assert _committed(outside, SLUG) == 0
    assert _committed(outside, NESTED_SLUG) == 0


def test_transactional_anidado_confirma_ambas_escrituras_al_terminar(
    schema_app, brands_cleanup, outside
):
    @transactional
    def outer():
        _create_brand(SLUG)
        _create_brand(NESTED_SLUG)

    with schema_app.app_context():
        outer()

    assert _committed(outside, SLUG) == 1
    assert _committed(outside, NESTED_SLUG) == 1
