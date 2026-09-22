"""Public catalog API (05_API.md §7).

Anonymous and read-only except POST /cart/revalidate (AD-32), which arrives with
the cart phase.

BK-03 gives each aggregate its own blueprint; they are nested under `public_bp`,
which carries the /api/v1 prefix (AD-17).
"""

from flask import Blueprint

from ....extensions import csrf
from .cart import cart_bp
from .classifications import (
    brands_bp,
    categories_bp,
    genders_bp,
    size_types_bp,
    sizes_bp,
    sports_bp,
)
from .products import products_bp
from .store import banks_bp, banners_bp, store_bp
from .turnstile import turnstile_bp

public_bp = Blueprint("public", __name__, url_prefix="/api/v1")

for blueprint in (
    store_bp,
    banners_bp,
    banks_bp,
    categories_bp,
    brands_bp,
    sports_bp,
    sizes_bp,
    genders_bp,
    size_types_bp,
    products_bp,
    cart_bp,
    turnstile_bp,
):
    public_bp.register_blueprint(blueprint)
    # Flask-WTF's blueprint exemption keys off `request.blueprint`, which for a
    # nested blueprint is the dotted child name ("public.cart") — so exempting
    # `public_bp` alone in api/__init__.py never covers these. Exempt each
    # nested blueprint directly so the intent of §8.3 (public API is anonymous
    # and needs no CSRF token) actually holds for every route inside it.
    csrf.exempt(blueprint)

__all__ = ["public_bp"]
