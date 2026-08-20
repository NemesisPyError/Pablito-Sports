"""Administrative panel API (05_API.md §9).

Every route under this prefix requires an authenticated session (05_API.md §5.1).
The blueprint is registered empty in Fase 1; authentication and CRUD arrive in
Fase 6 of the roadmap.
"""

from flask import Blueprint

from .auth import auth_bp
from .banners import banners_bp
from .classifications import (
    brands_bp,
    categories_bp,
    genders_bp,
    size_types_bp,
    sizes_bp,
    sports_bp,
)
from .dashboard import dashboard_bp
from .products import products_bp
from .promotions import promotions_bp
from .settings import settings_bp
from .trails import trails_bp
from .users import users_bp

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")

for blueprint in (
    auth_bp,
    dashboard_bp,
    products_bp,
    brands_bp,
    categories_bp,
    sports_bp,
    sizes_bp,
    # §9.17, §9.18: datos semilla, sólo lectura.
    genders_bp,
    size_types_bp,
    promotions_bp,
    banners_bp,
    settings_bp,
    users_bp,
    trails_bp,
):
    admin_bp.register_blueprint(blueprint)

__all__ = ["admin_bp"]
