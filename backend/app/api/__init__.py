"""Blueprint registry (10_BACKEND.md §6, BK-03)."""

from flask import Flask

from ..extensions import csrf, limiter
from ..health import health_bp
from ..seo import crawler_bp, seo_bp
from .v1 import admin_bp, public_bp


def register_blueprints(app: Flask) -> None:
    """Registers every blueprint of the application.

    Order does not affect routing, but it documents the surface: operational
    endpoints, then the public API, then the panel, then the crawler documents.
    """
    app.register_blueprint(health_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(seo_bp)
    app.register_blueprint(crawler_bp)

    # §6.4: los documentos para rastreadores no llevan límite de tasa (AD-09).
    # Un buscador que rastrea el catálogo entero no debe recibir un 429, y son
    # lecturas anónimas sin efecto, de modo que tampoco necesitan CSRF.
    for blueprint in (seo_bp, crawler_bp):
        csrf.exempt(blueprint)
        limiter.exempt(blueprint)

    # 03_SEGURIDAD.md §8.3: la API pública es anónima y de solo lectura, así que
    # no lleva token CSRF. Incluye POST /cart/revalidate, que no crea recurso
    # alguno (AD-32) y por tanto no es un objetivo de CSRF.
    csrf.exempt(public_bp)

    # Los health checks son contrato operativo (12_DEPLOY.md §10): ni CSRF ni
    # límite de tasa deben interferir con las sondas del despliegue.
    csrf.exempt(health_bp)
    limiter.exempt(health_bp)


__all__ = ["register_blueprints"]
