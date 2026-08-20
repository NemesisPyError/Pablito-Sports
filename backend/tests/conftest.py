"""Shared fixtures (11_TESTING.md §12)."""

import pytest

from app import create_app
from app.core.config import TestingConfig


@pytest.fixture
def app():
    """Application configured for the testing environment."""
    application = create_app(TestingConfig)
    application.config.update(PROPAGATE_EXCEPTIONS=False)
    return application


@pytest.fixture
def client(app):
    return app.test_client()
