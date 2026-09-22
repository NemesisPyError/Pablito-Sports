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


# ---------------------------------------------------------------------------
# Almacenamiento del rate limiting (03_SEGURIDAD.md §14.4)
# ---------------------------------------------------------------------------


def _entorno_de_produccion(monkeypatch):
    """Deja el entorno mínimo para que `validate` llegue al chequeo del almacén."""
    monkeypatch.setenv("SECRET_KEY", "x" * 64)
    monkeypatch.setenv("DATABASE_URL", "postgresql://u:p@localhost/db")
    monkeypatch.setenv("UPLOAD_FOLDER", "/tmp/uploads")
    monkeypatch.setenv("LOG_LEVEL", "INFO")


def test_produccion_no_arranca_sin_almacen_de_rate_limit(monkeypatch):
    """§14.4: el contador debe vivir fuera del proceso, y se exige al arrancar."""
    _entorno_de_produccion(monkeypatch)
    monkeypatch.delenv("RATELIMIT_STORAGE_URI", raising=False)

    with pytest.raises(ConfigError, match="RATELIMIT_STORAGE_URI"):
        ProductionConfig.validate()


def test_produccion_rechaza_un_almacen_dentro_del_proceso(monkeypatch):
    """`memory://` da un contador por worker: el límite declarado dejaría de ser real."""
    _entorno_de_produccion(monkeypatch)
    monkeypatch.setenv("RATELIMIT_STORAGE_URI", "memory://")

    with pytest.raises(ConfigError, match="in-process"):
        ProductionConfig.validate()


def test_produccion_acepta_un_almacen_compartido(monkeypatch):
    _entorno_de_produccion(monkeypatch)
    monkeypatch.setenv("RATELIMIT_STORAGE_URI", "redis://redis:6379/0")

    ProductionConfig.validate()


def test_ningun_entorno_vuelve_en_silencio_a_memoria(monkeypatch):
    """Si el almacén compartido falla, el límite debe fallar visible, no ceder.

    `RATELIMIT_IN_MEMORY_FALLBACK_ENABLED` haría que Flask-Limiter siguiera
    contando en memoria del proceso —el bug que esta fase corrige— y
    `RATELIMIT_SWALLOW_ERRORS` dejaría pasar la petición sin contarla.
    """
    for config in (DevelopmentConfig, TestingConfig, ProductionConfig):
        assert config.RATELIMIT_IN_MEMORY_FALLBACK_ENABLED is False
        assert config.RATELIMIT_SWALLOW_ERRORS is False


# ---------------------------------------------------------------------------
# Cloudflare Turnstile: opcional, pero nunca a medias.
# ---------------------------------------------------------------------------


def _entorno_de_testing(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "x" * 64)
    monkeypatch.setenv("TEST_DATABASE_URL", "postgresql://u:p@localhost/db")
    monkeypatch.setenv("UPLOAD_FOLDER", "/tmp/uploads")
    monkeypatch.setenv("LOG_LEVEL", "INFO")


def test_arranca_sin_ninguna_clave_de_turnstile(monkeypatch):
    """Configuración explícita de desarrollo: sin credenciales, el gate se
    desactiva solo (`TurnstileService.enabled()`) en vez de romper el arranque."""
    _entorno_de_testing(monkeypatch)
    monkeypatch.delenv("TURNSTILE_SITE_KEY", raising=False)
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)

    TestingConfig.validate()


def test_arranca_con_las_dos_claves_de_turnstile(monkeypatch):
    _entorno_de_testing(monkeypatch)
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")

    TestingConfig.validate()


def test_rechaza_solo_la_site_key_puesta(monkeypatch):
    _entorno_de_testing(monkeypatch)
    monkeypatch.setenv("TURNSTILE_SITE_KEY", "site-key")
    monkeypatch.delenv("TURNSTILE_SECRET_KEY", raising=False)

    with pytest.raises(ConfigError, match="TURNSTILE"):
        TestingConfig.validate()


def test_rechaza_solo_la_secret_key_puesta(monkeypatch):
    _entorno_de_testing(monkeypatch)
    monkeypatch.delenv("TURNSTILE_SITE_KEY", raising=False)
    monkeypatch.setenv("TURNSTILE_SECRET_KEY", "secret-key")

    with pytest.raises(ConfigError, match="TURNSTILE"):
        TestingConfig.validate()
