"""Catalog query parameters (05_API.md §7.3)."""

from dataclasses import dataclass, field

from ..core.utils.pagination import PageRequest
from .shared import parse_bool, parse_int, parse_page_request, parse_slug_list

# §7.3: closed set. An unrecognised value is ignored and the default applies (§4.6).
SORT_VALUES = ("name_asc", "name_desc", "price_asc", "price_desc", "newest", "featured")
DEFAULT_SORT = "name_asc"

SLUG_FILTERS = ("brand", "category", "gender", "sport", "size")

# §9.3: el panel tiene su propio conjunto de ordenamientos, distinto del público.
ADMIN_SORT_VALUES = (
    "name_asc",
    "name_desc",
    "created_desc",
    "updated_desc",
    "price_asc",
    "price_desc",
)
ADMIN_DEFAULT_SORT = "name_asc"

# §9.3: el panel filtra por marca y categoría en slug, igual que el público (AD-23).
ADMIN_SLUG_FILTERS = ("brand", "category")


@dataclass
class ProductListQuery:
    """Validated catalog input, still expressed in slugs (AD-23)."""

    search: str | None = None
    slugs: dict[str, list[str]] = field(default_factory=dict)
    min_price: int | None = None
    max_price: int | None = None
    on_sale: bool | None = None
    is_new: bool | None = None
    is_featured: bool | None = None
    sort: str = DEFAULT_SORT
    page: PageRequest = field(default_factory=PageRequest)
    # ¿El cliente pidió un tamaño de página concreto?
    #
    # Es información de la **petición**, no de negocio: distingue "quiero 12"
    # de "decidí vos". El listado de destacados usa esa distinción para aplicar
    # `store_settings.featured_products_count` sólo cuando nadie pidió otra
    # cosa. Quién decide el número es cosa del servicio, que es el que puede
    # leer la configuración (10_BACKEND.md §8.2).
    per_page_provided: bool = False


def parse_product_list_query(args) -> ProductListQuery:
    """Parses the query string. Unknown parameters are ignored (AD-26, CE-20)."""
    search = (args.get("q") or "").strip() or None

    sort = args.get("sort")
    if sort not in SORT_VALUES:
        sort = DEFAULT_SORT

    return ProductListQuery(
        search=search,
        slugs={name: parse_slug_list(args, name) for name in SLUG_FILTERS},
        min_price=parse_int(args, "min_price", minimum=0),
        max_price=parse_int(args, "max_price", minimum=0),
        on_sale=parse_bool(args, "on_sale"),
        is_new=parse_bool(args, "is_new"),
        is_featured=parse_bool(args, "is_featured"),
        sort=sort,
        page=parse_page_request(args),
        per_page_provided=bool((args.get("per_page") or "").strip()),
    )


@dataclass
class AdminProductListQuery:
    """Entrada validada del listado del panel (05_API.md §9.3).

    A diferencia del catálogo público, incluye inactivos y eliminados: el panel
    los ve cuando los pide explícitamente (02_ARQUITECTURA.md §12.6).
    """

    search: str | None = None
    brand_slugs: list[str] = field(default_factory=list)
    category_slugs: list[str] = field(default_factory=list)
    availability: list[str] = field(default_factory=list)
    is_active: bool | None = None
    deleted: bool | None = None
    sort: str = ADMIN_DEFAULT_SORT
    page: PageRequest = field(default_factory=PageRequest)


def parse_admin_product_list_query(args) -> AdminProductListQuery:
    """§9.3. Un parámetro desconocido se ignora (AD-26); uno conocido pero mal formado es 422."""
    sort = args.get("sort")
    if sort not in ADMIN_SORT_VALUES:
        sort = ADMIN_DEFAULT_SORT

    return AdminProductListQuery(
        search=(args.get("q") or "").strip() or None,
        brand_slugs=parse_slug_list(args, "brand"),
        category_slugs=parse_slug_list(args, "category"),
        availability=parse_slug_list(args, "availability"),
        is_active=parse_bool(args, "is_active"),
        deleted=parse_bool(args, "deleted"),
        sort=sort,
        page=parse_page_request(args),
    )
