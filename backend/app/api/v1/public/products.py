"""Product endpoints (05_API.md §7.3, §7.4)."""

from flask import Blueprint, request

from ....core.utils.responses import success_response
from ....schemas.product_schemas import parse_product_list_query
from ....services.product_service import ProductService

products_bp = Blueprint("products", __name__)


@products_bp.get("/products")
def list_products():
    """§7.3: paginated catalog with facets in `meta` (RN-47)."""
    query = parse_product_list_query(request.args)

    page = ProductService.list_catalog(query)
    meta = page.to_meta()
    meta["facets"] = ProductService.facets(query)

    return success_response([item.to_dict() for item in page.items], meta=meta)


@products_bp.get("/products/home-new")
def list_home_new_products():
    """§7.2d: Novedades — selección editorial, en el orden que fija el panel."""
    items = ProductService.list_home_new()
    return success_response([item.to_dict() for item in items])


@products_bp.get("/products/<string:slug>")
def get_product(slug: str):
    """§7.4: 404 when the product does not exist or is not visible."""
    product = ProductService.get_detail_by_slug(slug)
    return success_response(product.to_dict())
