"""Base configuration shared by every environment.

CFG-01: only `core/config` reads environment variables (AD-11).
CFG-02: required values are validated at startup; the app refuses to boot without them.
CFG-04: a value is declared once, in one place.
"""

import os


class ConfigError(RuntimeError):
    """Raised when the environment does not provide a required configuration value."""


class BaseConfig:
    ENV_NAME = "base"

    # CFG-02: every name listed here must be present or the application will not start.
    REQUIRED_VARS = ("SECRET_KEY", "DATABASE_URL", "UPLOAD_FOLDER", "LOG_LEVEL")

    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    UPLOAD_FOLDER = os.environ.get("UPLOAD_FOLDER")
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

    # 03_SEGURIDAD.md §14.2: número de proxies de confianza situados delante de
    # Flask. La IP real, el esquema y el host se toman **solo** de esa cantidad
    # de saltos en `X-Forwarded-*`; un valor enviado por un cliente arbitrario
    # nunca se cree. Topología actual (Nginx → Flask): 1. Con Cloudflare delante
    # (Cloudflare → Nginx → Flask) pasa a 2. `0` desactiva ProxyFix.
    TRUSTED_PROXY_COUNT = int(os.environ.get("TRUSTED_PROXY_COUNT", "1"))

    # Origen público del sitio, para las URL absolutas que exigen Open Graph y
    # el sitemap. Opcional: sin él se reconstruye de las cabeceras que reenvía
    # Nginx. Se declara para poder fijarlo cuando el dominio público no coincide
    # con el `Host` que llega al backend.
    SITE_BASE_URL = os.environ.get("SITE_BASE_URL")

    # 03_SEGURIDAD.md §7.1 and SEG-01.
    SESSION_COOKIE_NAME = "session"
    SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "True") == "True"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"
    SESSION_COOKIE_PATH = "/api/v1/admin"
    PERMANENT_SESSION_LIFETIME = 43200  # 12 hours, absolute expiry (SEG-01)

    # AD-37: server-side session, not a self-contained token. Flask's default
    # cookie holds the payload itself, which is exactly what AD-37 rejects.
    # 10_BACKEND.md §12 fixes the backend and the table name.
    SESSION_TYPE = "sqlalchemy"
    SESSION_SQLALCHEMY_TABLE = "sessions"
    SESSION_PERMANENT = True
    SESSION_USE_SIGNER = True

    # SEG-01: 30 minutes of inactivity closes the session (RF-28). The absolute
    # 12-hour expiry is enforced separately by the auth service.
    SESSION_IDLE_TIMEOUT = 1800

    # 03_SEGURIDAD.md §8: CSRF token on every panel write.
    WTF_CSRF_ENABLED = True
    WTF_CSRF_HEADERS = ["X-CSRF-Token"]
    WTF_CSRF_TIME_LIMIT = None

    # 03_SEGURIDAD.md §14.1: límites por endpoint.
    RATELIMIT_ENABLED = True
    RATELIMIT_STORAGE_URI = "memory://"
    RATELIMIT_HEADERS_ENABLED = True

    # 05_API.md §4: field order in the envelope is not part of the contract, but a
    # stable order keeps logged responses diffable.
    JSON_SORT_KEYS = False

    # 03_SEGURIDAD.md §11.1: 5 MB per uploaded file.
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024

    @classmethod
    def validate(cls) -> None:
        """Fail fast when a required environment variable is missing (CFG-02)."""
        missing = [name for name in cls.REQUIRED_VARS if not os.environ.get(name)]
        if missing:
            raise ConfigError(
                "Missing required environment variables: " + ", ".join(sorted(missing))
            )
