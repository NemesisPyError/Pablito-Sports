"""Classification endpoints (05_API.md §7.5 to §7.11).

Routes extract parameters, delegate to the service and wrap the result in the
AD-16 envelope. They hold no business logic and never reach a repository (DEP-01).
"""

from flask import Blueprint, request

from ....core.utils.responses import success_response
from ....schemas.shared import parse_page_request
from ....services.catalog_service import CatalogService

brands_bp = Blueprint("brands", __name__)
sports_bp = Blueprint("sports", __name__)
sizes_bp = Blueprint("sizes", __name__)
genders_bp = Blueprint("genders", __name__)
size_types_bp = Blueprint("size_types", __name__)
categories_bp = Blueprint("categories", __name__)


@brands_bp.get("/brands")
def list_brands():
    """§7.6"""
    page = CatalogService.list_brands(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@sports_bp.get("/sports")
def list_sports():
    """§7.7"""
    page = CatalogService.list_sports(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@sizes_bp.get("/sizes")
def list_sizes():
    """§7.9"""
    size_type = (request.args.get("size_type") or "").strip() or None
    page = CatalogService.list_sizes(parse_page_request(request.args), size_type)
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@genders_bp.get("/genders")
def list_genders():
    """§7.10"""
    page = CatalogService.list_genders(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@size_types_bp.get("/size-types")
def list_size_types():
    """§7.11"""
    page = CatalogService.list_size_types(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@categories_bp.get("/categories")
def list_categories():
    """§7.5: the tree is not paginated; it is at most two levels deep (AD-24)."""
    tree = CatalogService.list_category_tree()
    return success_response([item.to_dict() for item in tree])
