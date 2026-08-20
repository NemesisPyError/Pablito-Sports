"""Configuration per environment (CFG-01, CFG-02, 10_BACKEND.md §12)."""

import pytest

from app.core.config import (
    ConfigError,
    DevelopmentConfig,
    ProductionConfig,
    TestingConfig,
    get_config,
)


def test_get_config_resolves_each_environment_name():
    assert get_config("development") is DevelopmentConfig
    assert get_config("testing") is TestingConfig
    assert get_config("production") is ProductionConfig


def test_get_config_rejects_unknown_environment():
    with pytest.raises(ConfigError):
        get_config("staging-typo")


def test_debug_and_testing_flags_differ_by_environment():
    assert (DevelopmentConfig.DEBUG, DevelopmentConfig.TESTING) == (True, False)
    assert (TestingConfig.DEBUG, TestingConfig.TESTING) == (False, True)
    assert (ProductionConfig.DEBUG, ProductionConfig.TESTING) == (False, False)


def test_session_cookie_is_secure_only_in_production():
    # RNF-12: HTTPS is mandatory in production; local development has no TLS.
    assert ProductionConfig.SESSION_COOKIE_SECURE is True
    assert DevelopmentConfig.SESSION_COOKIE_SECURE is False
    assert TestingConfig.SESSION_COOKIE_SECURE is False


def test_session_cookie_attributes_follow_seg_01():
    for config in (DevelopmentConfig, TestingConfig, ProductionConfig):
        assert config.SESSION_COOKIE_HTTPONLY is True
        assert config.SESSION_COOKIE_SAMESITE == "Strict"
        assert config.SESSION_COOKIE_PATH == "/api/v1/admin"
        assert config.PERMANENT_SESSION_LIFETIME == 43200


def test_missing_required_variable_prevents_startup(monkeypatch):
    # CFG-02: failing at boot is preferable to failing on the first request.
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(ConfigError, match="SECRET_KEY"):
        TestingConfig.validate()


def test_testing_environment_requires_its_own_database():
    assert "TEST_DATABASE_URL" in TestingConfig.REQUIRED_VARS
    assert "DATABASE_URL" in DevelopmentConfig.REQUIRED_VARS
