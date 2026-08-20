"""Flask application factory (10_BACKEND.md §6).

Boot order is fixed and must not be reshuffled:

    config → logging → SQLAlchemy → Migrate → Session → CSRF → rate limit
    → blueprints → error handlers → middleware

Rules of §6: no extension is initialised outside the factory, configuration is
validated before anything else is configured (CFG-02), blueprints are registered
after the extensions but before the error handlers, and middleware is registered
last so it wraps the whole application.
"""

from flask import Flask
from werkzeug.middleware.proxy_fix import ProxyFix

from .api import errors as error_handlers
from .api import register_blueprints
from .core.config import BaseConfig, get_config
from .core.logging import config as logging_config
from .core.logging import request_context
from .core.security import headers as security_headers
from .extensions import csrf, db, limiter, migrate, server_session


def _drop_session_table_from_metadata(app: Flask) -> None:
    """Permite construir más de una aplicación sobre el mismo `db.metadata`.

    Flask-Session declara su tabla al inicializarse. Como `db` es un singleton de
    módulo, una segunda `create_app()` —lo habitual en los tests— chocaría con
    `Table 'sessions' is already defined`. Se descarta la definición previa para
    que la extensión la vuelva a declarar sobre la aplicación nueva.
    """
    table_name = app.config.get("SESSION_SQLALCHEMY_TABLE", "sessions")
    existing = db.metadata.tables.get(table_name)
    if existing is not None:
        db.metadata.remove(existing)


def create_app(config_object: type[BaseConfig] | None = None) -> Flask:
    """Builds and configures the Flask application.

    Raises ConfigError when a required environment variable is missing (CFG-02).
    """
    config = config_object or get_config()
    config.validate()

    app = Flask(__name__)
    app.config.from_object(config)

    # 03_SEGURIDAD.md §14.2: ProxyFix se aplica **antes** que cualquier otra
    # cosa porque reescribe el entorno WSGI (`REMOTE_ADDR`, esquema, host) a
    # partir de `X-Forwarded-*`, y todo lo que sigue —rate limiting, auditoría,
    # URLs absolutas, detección de HTTPS— debe leer ya la IP y el esquema
    # reales. Solo se confía en `TRUSTED_PROXY_COUNT` saltos: un cliente que
    # inyecte encabezados de más queda por fuera de la ventana de confianza y
    # se ignora. `0` desactiva el envoltorio (backend accedido sin proxy).
    trusted_hops = app.config.get("TRUSTED_PROXY_COUNT", 1)
    if trusted_hops > 0:
        app.wsgi_app = ProxyFix(
            app.wsgi_app,
            x_for=trusted_hops,
            x_proto=trusted_hops,
            x_host=trusted_hops,
            x_port=trusted_hops,
        )

    logging_config.init_app(app)

    db.init_app(app)
    # Importing the models registers every table in db.metadata, which is what
    # Alembic compares against the live database.
    from . import models  # noqa: F401

    migrate.init_app(app, db, directory="migrations")

    # AD-37: the session lives in the database, not inside the cookie. The
    # extension needs the SQLAlchemy handle before it can create its table.
    app.config["SESSION_SQLALCHEMY"] = db
    _drop_session_table_from_metadata(app)
    server_session.init_app(app)

    # 03_SEGURIDAD.md §8 and §14. Both are opt-in per blueprint: the public API
    # is anonymous and read-only, so it needs no CSRF token (§8.3).
    csrf.init_app(app)
    limiter.init_app(app)

    register_blueprints(app)
    error_handlers.init_app(app)

    # Middleware last (§6, rule 4). request_context runs first of all because the
    # correlation id must exist before anything logs or answers (OA-09).
    request_context.init_app(app)
    security_headers.init_app(app)

    app.logger.info(
        "application ready",
        extra={"environment": config.ENV_NAME, "debug": app.config["DEBUG"]},
    )

    return app
