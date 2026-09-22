"""Admin product endpoints (05_API.md §9.2)."""

from flask import Blueprint, current_app, request

from ....core.exceptions import BadRequestError, RequestValidationError
from ....core.utils.responses import success_response
from ....infrastructure.storage.local_storage import LocalStorage
from ....schemas.product_schemas import parse_admin_product_list_query
from ....schemas.shared import json_body
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_product_service import AdminProductService

products_bp = Blueprint("admin_products", __name__)


def _admin_required():
    """PA-06: la autorización real la impone el backend en cada endpoint.

    Devuelve el identificador del administrador porque toda escritura debe
    quedar atribuida en `audit_logs` (`AD-20`) y el servicio no puede leer la
    sesión por su cuenta (10_BACKEND.md §8.4).
    """
    return AdminAuthService.require_administrator().id


def _page_meta(page):
    return {
        "page": page.page,
        "per_page": page.per_page,
        "total": page.total,
        "total_pages": page.total_pages,
    }


@products_bp.get("/products")
def list_products():
    _admin_required()
    query = parse_admin_product_list_query(request.args)
    result = AdminProductService.list_paginated(query)
    return success_response(list(result.items), meta=_page_meta(result))


@products_bp.post("/products")
def create_product():
    administrator_id = _admin_required()
    item = AdminProductService.create(json_body(), administrator_id=administrator_id)
    return success_response(item, status_code=201)


@products_bp.get("/products/<int:product_id>")
def get_product(product_id: int):
    _admin_required()
    return success_response(AdminProductService.get_by_id(product_id))


@products_bp.put("/products/<int:product_id>")
def update_product(product_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminProductService.update(product_id, json_body(), administrator_id=administrator_id)
    )


@products_bp.delete("/products/<int:product_id>")
def delete_product(product_id: int):
    administrator_id = _admin_required()
    AdminProductService.delete(product_id, administrator_id=administrator_id)
    # §9.3: soft delete responde 204. Un 204 no lleva cuerpo, así que aquí no
    # aplica la envoltura AD-16: no hay nada que envolver.
    return "", 204


@products_bp.post("/products/<int:product_id>/set-active")
def set_active(product_id: int):
    administrator_id = _admin_required()
    payload = json_body()
    if "is_active" not in payload:
        raise BadRequestError("is_active es obligatorio")
    return success_response(
        AdminProductService.set_active(
            product_id, bool(payload["is_active"]), administrator_id=administrator_id
        )
    )


@products_bp.post("/products/<int:product_id>/set-home-new")
def set_home_new(product_id: int):
    administrator_id = _admin_required()
    payload = json_body()
    if "selected" not in payload:
        raise BadRequestError("selected es obligatorio")
    return success_response(
        AdminProductService.set_home_new(
            product_id, bool(payload["selected"]), administrator_id=administrator_id
        )
    )


# Variants


@products_bp.get("/products/<int:product_id>/variants")
def list_variants(product_id: int):
    _admin_required()
    product = AdminProductService.get_by_id(product_id)
    return success_response(product["variants"])


@products_bp.put("/products/<int:product_id>/variants/<int:variant_id>")
def update_variant_quantity(product_id: int, variant_id: int):
    administrator_id = _admin_required()
    payload = json_body()
    quantity = payload.get("quantity")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity < 0:
        raise RequestValidationError(
            [{"field": "quantity", "detail": "quantity must be an integer >= 0"}]
        )
    return success_response(
        AdminProductService.set_variant_quantity(
            product_id, variant_id, quantity, administrator_id=administrator_id
        )
    )


@products_bp.post("/products/<int:product_id>/variants/<int:variant_id>/sales")
def register_sale(product_id: int, variant_id: int):
    """RN-82: registra una venta, que descuenta la cantidad automáticamente."""
    administrator_id = _admin_required()
    payload = json_body()
    quantity = payload.get("quantity")
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise RequestValidationError(
            [{"field": "quantity", "detail": "quantity must be a positive integer"}]
        )
    return success_response(
        AdminProductService.register_sale(
            product_id, variant_id, quantity, administrator_id=administrator_id
        )
    )


@products_bp.delete("/products/<int:product_id>/variants/<int:variant_id>")
def delete_variant(product_id: int, variant_id: int):
    administrator_id = _admin_required()
    AdminProductService.delete_variant(product_id, variant_id, administrator_id=administrator_id)
    # §9.4: soft delete de variante responde 204.
    return "", 204


# Images


@products_bp.get("/products/<int:product_id>/images")
def list_images(product_id: int):
    _admin_required()
    return success_response(AdminProductService.list_images(product_id))


@products_bp.post("/products/<int:product_id>/images")
def upload_image(product_id: int):
    administrator_id = _admin_required()
    if "file" not in request.files:
        raise BadRequestError("No se envió archivo")

    file = request.files["file"]
    if file.filename == "":
        raise BadRequestError("Nombre de archivo vacío")

    storage = LocalStorage(current_app.config["UPLOAD_FOLDER"])
    file_path = storage.save(file, product_id=product_id)

    alt_text = request.form.get("alt_text") or None
    is_primary = request.form.get("is_primary") == "true"

    image = AdminProductService.create_image(
        product_id, file_path, alt_text, is_primary, administrator_id=administrator_id
    )
    return success_response(image, status_code=201)


@products_bp.put("/products/<int:product_id>/images/<int:image_id>")
def update_image(product_id: int, image_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminProductService.update_image(
            product_id,
            image_id,
            json_body(),
            administrator_id=administrator_id,
        )
    )


@products_bp.delete("/products/<int:product_id>/images/<int:image_id>")
def delete_image(product_id: int, image_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminProductService.delete_image(product_id, image_id, administrator_id=administrator_id)
    )


@products_bp.post("/products/<int:product_id>/images/reorder")
def reorder_images(product_id: int):
    administrator_id = _admin_required()
    payload = json_body()
    image_ids = payload.get("image_ids", [])
    if not isinstance(image_ids, list):
        raise BadRequestError("image_ids debe ser una lista")
    return success_response(
        AdminProductService.reorder_images(product_id, image_ids, administrator_id=administrator_id)
    )


@products_bp.post("/products/<int:product_id>/images/<int:image_id>/set-primary")
def set_primary_image(product_id: int, image_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminProductService.set_primary_image(
            product_id, image_id, administrator_id=administrator_id
        )
    )
