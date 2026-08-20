"""Fixtures for integration tests against a real PostgreSQL database.

11_TESTING.md §12.1: constraints and CHECKs are verified by integration tests that
try to violate them. The schema is built by the migrations themselves, so the
tests exercise what production will actually run.
"""

import pytest
from flask_migrate import upgrade
from sqlalchemy.orm import Session

from app import create_app
from app.core.config import TestingConfig
from app.extensions import db


@pytest.fixture(scope="session")
def schema_app():
    """Application whose test database has every migration applied."""
    application = create_app(TestingConfig)
    with application.app_context():
        upgrade()
        yield application


@pytest.fixture(scope="session")
def catalog_client(schema_app):
    """Test client over a database loaded with the reproducible catalog fixture."""
    from tests.fixtures.catalog import build_catalog, clear_business_data

    with schema_app.app_context():
        clear_business_data()
        build_catalog()
        try:
            yield schema_app.test_client()
        finally:
            clear_business_data()


@pytest.fixture
def administrator_id(schema_app):
    """Administrador de pruebas, creado y retirado en cada test (§14.3)."""
    from tests.fixtures.admin import create_test_administrator, delete_test_administrator

    with schema_app.app_context():
        identifier = create_test_administrator()
        try:
            yield identifier
        finally:
            delete_test_administrator()


@pytest.fixture
def admin_client(schema_app, administrator_id):
    """Cliente con sesión de servidor abierta, sin pasar por el login.

    El login tiene su propia batería; aquí interesa la escritura, no el acceso.
    """
    from datetime import UTC, datetime

    client = schema_app.test_client()
    with client.session_transaction() as flask_session:
        flask_session["admin_id"] = administrator_id
        flask_session["logged_in_at"] = datetime.now(UTC).isoformat()
        flask_session["last_seen_at"] = datetime.now(UTC).isoformat()
    return client


@pytest.fixture
def outside():
    """Vista de la base fuera de la sesión de la aplicación (solo datos confirmados)."""
    from tests.fixtures.admin import outside_engine

    engine = outside_engine()
    try:
        yield engine
    finally:
        engine.dispose()


@pytest.fixture
def session(schema_app):
    """Session wrapped in a transaction that is rolled back after each test."""
    with schema_app.app_context():
        connection = db.engine.connect()
        transaction = connection.begin()
        db_session = Session(bind=connection)
        try:
            yield db_session
        finally:
            db_session.close()
            # A failed constraint aborts the transaction, which PostgreSQL then
            # deassociates; only roll back while it is still live.
            if transaction.is_active:
                transaction.rollback()
            connection.close()
