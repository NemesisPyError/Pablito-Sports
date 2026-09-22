"""Admin CRUD endpoints for classification entities (05_API.md §9.2)."""

from flask import Blueprint, current_app, request

from ....core.exceptions import RequestValidationError
from ....core.utils.pagination import parse_page_request
from ....core.utils.responses import success_response
from ....infrastructure.storage.local_storage import LocalStorage
from ....schemas.shared import json_body
from ....services.admin_auth_service import AdminAuthService
from ....services.admin_brand_image_service import AdminBrandImageService
from ....services.admin_classification_service import (
    AdminBrandService,
    AdminCategoryService,
    AdminSizeService,
    AdminSportService,
)
from ....services.admin_seed_service import AdminSeedDataService

brands_bp = Blueprint("admin_brands", __name__)
categories_bp = Blueprint("admin_categories", __name__)
sports_bp = Blueprint("admin_sports", __name__)
sizes_bp = Blueprint("admin_sizes", __name__)
genders_bp = Blueprint("admin_genders", __name__)
size_types_bp = Blueprint("admin_size_types", __name__)


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


# Brands


@brands_bp.get("/brands")
def list_brands():
    _admin_required()
    page = parse_page_request(request.args)
    result = AdminBrandService.list_paginated(page.page, page.per_page)
    return success_response(list(result.items), meta=_page_meta(result))


@brands_bp.post("/brands")
def create_brand():
    administrator_id = _admin_required()
    item = AdminBrandService.create(json_body(), administrator_id=administrator_id)
    return success_response(item, status_code=201)


@brands_bp.get("/brands/<int:brand_id>")
def get_brand(brand_id: int):
    _admin_required()
    return success_response(AdminBrandService.get_by_id(brand_id))


@brands_bp.put("/brands/<int:brand_id>")
def update_brand(brand_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminBrandService.update(brand_id, json_body(), administrator_id=administrator_id)
    )


@brands_bp.delete("/brands/<int:brand_id>")
def delete_brand(brand_id: int):
    administrator_id = _admin_required()
    return success_response(AdminBrandService.delete(brand_id, administrator_id=administrator_id))


@brands_bp.post("/brands/<int:brand_id>/restore")
def restore_brand(brand_id: int):
    administrator_id = _admin_required()
    return success_response(AdminBrandService.restore(brand_id, administrator_id=administrator_id))


# Logotipo y collage de marca (§9.6, v1.1.0)
#
# El logotipo y las piezas del collage son archivos, no campos de forma: viajan
# por recursos propios en `multipart/form-data`. El CRUD de la marca sigue
# siendo JSON, de modo que renombrarla no obliga a reenviar sus imágenes.


def _imagen_requerida():
    archivo = request.files.get("image")
    if archivo is None or not (archivo.filename or "").strip():
        raise RequestValidationError([{"field": "image", "detail": "image is required"}])
    return archivo


def _guardar_imagen_de_marca(brand_id: int) -> str:
    """`AD-40`: el archivo se escribe antes que la fila, fuera de la transacción."""
    storage = LocalStorage(current_app.config["UPLOAD_FOLDER"])
    return storage.save_brand_image(_imagen_requerida(), brand_id=brand_id)


@brands_bp.put("/brands/<int:brand_id>/image")
def set_brand_image(brand_id: int):
    """PUT /api/v1/admin/brands/{id}/image (§9.6). Logotipo de la marca."""
    administrator_id = _admin_required()
    # La marca se comprueba antes de tocar el disco: subir el archivo de una
    # marca inexistente dejaría basura en el volumen.
    AdminBrandService.get_by_id(brand_id)

    image_path = _guardar_imagen_de_marca(brand_id)
    return success_response(
        AdminBrandService.set_image(brand_id, image_path, administrator_id=administrator_id)
    )


@brands_bp.delete("/brands/<int:brand_id>/image")
def delete_brand_image(brand_id: int):
    """DELETE /api/v1/admin/brands/{id}/image (§9.6). Quita el logotipo."""
    administrator_id = _admin_required()
    return success_response(
        AdminBrandService.set_image(brand_id, None, administrator_id=administrator_id)
    )


@brands_bp.get("/brands/<int:brand_id>/images")
def list_brand_images(brand_id: int):
    """GET /api/v1/admin/brands/{id}/images (§9.6). Collage ordenado."""
    _admin_required()
    return success_response(AdminBrandImageService.list_by_brand(brand_id))


@brands_bp.post("/brands/<int:brand_id>/images")
def add_brand_image(brand_id: int):
    """POST /api/v1/admin/brands/{id}/images (§9.6). Agrega una pieza."""
    administrator_id = _admin_required()
    AdminBrandService.get_by_id(brand_id)

    image_path = _guardar_imagen_de_marca(brand_id)
    item = AdminBrandImageService.add(
        brand_id,
        file_path=image_path,
        alt_text=request.form.get("alt_text"),
        administrator_id=administrator_id,
    )
    return success_response(item, status_code=201)


@brands_bp.put("/brands/<int:brand_id>/images/order")
def reorder_brand_images(brand_id: int):
    """PUT /api/v1/admin/brands/{id}/images/order (§9.6)."""
    administrator_id = _admin_required()
    payload = json_body()
    return success_response(
        AdminBrandImageService.reorder(
            brand_id, payload.get("image_ids"), administrator_id=administrator_id
        )
    )


@brands_bp.delete("/brands/<int:brand_id>/images/<int:image_id>")
def delete_brand_image_piece(brand_id: int, image_id: int):
    """DELETE /api/v1/admin/brands/{id}/images/{image_id} (§9.6). 204."""
    administrator_id = _admin_required()
    AdminBrandImageService.delete(brand_id, image_id, administrator_id=administrator_id)
    return "", 204


# Categories


@categories_bp.get("/categories")
def list_categories():
    _admin_required()
    page = parse_page_request(request.args)
    result = AdminCategoryService.list_paginated(page.page, page.per_page)
    return success_response(list(result.items), meta=_page_meta(result))


@categories_bp.post("/categories")
def create_category():
    administrator_id = _admin_required()
    item = AdminCategoryService.create(json_body(), administrator_id=administrator_id)
    return success_response(item, status_code=201)


@categories_bp.get("/categories/<int:category_id>")
def get_category(category_id: int):
    _admin_required()
    return success_response(AdminCategoryService.get_by_id(category_id))


@categories_bp.put("/categories/<int:category_id>")
def update_category(category_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminCategoryService.update(category_id, json_body(), administrator_id=administrator_id)
    )


@categories_bp.delete("/categories/<int:category_id>")
def delete_category(category_id: int):
    administrator_id = _admin_required()
    AdminCategoryService.delete(category_id, administrator_id=administrator_id)
    # §9.5: el borrado lógico responde 204. Un 204 no lleva cuerpo, así que aquí
    # no aplica la envoltura AD-16: no hay nada que envolver. El 409 por RN-68
    # sigue viajando con envoltura, porque un error sí tiene contenido.
    return "", 204


@categories_bp.post("/categories/<int:category_id>/restore")
def restore_category(category_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminCategoryService.restore(category_id, administrator_id=administrator_id)
    )


# Sports


@sports_bp.get("/sports")
def list_sports():
    _admin_required()
    page = parse_page_request(request.args)
    result = AdminSportService.list_paginated(page.page, page.per_page)
    return success_response(list(result.items), meta=_page_meta(result))


@sports_bp.post("/sports")
def create_sport():
    administrator_id = _admin_required()
    item = AdminSportService.create(json_body(), administrator_id=administrator_id)
    return success_response(item, status_code=201)


@sports_bp.get("/sports/<int:sport_id>")
def get_sport(sport_id: int):
    _admin_required()
    return success_response(AdminSportService.get_by_id(sport_id))


@sports_bp.put("/sports/<int:sport_id>")
def update_sport(sport_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminSportService.update(sport_id, json_body(), administrator_id=administrator_id)
    )


@sports_bp.delete("/sports/<int:sport_id>")
def delete_sport(sport_id: int):
    administrator_id = _admin_required()
    return success_response(AdminSportService.delete(sport_id, administrator_id=administrator_id))


@sports_bp.post("/sports/<int:sport_id>/restore")
def restore_sport(sport_id: int):
    administrator_id = _admin_required()
    return success_response(AdminSportService.restore(sport_id, administrator_id=administrator_id))


# Sizes


@sizes_bp.get("/sizes")
def list_sizes():
    _admin_required()
    page = parse_page_request(request.args)
    result = AdminSizeService.list_paginated(page.page, page.per_page)
    return success_response(list(result.items), meta=_page_meta(result))


@sizes_bp.post("/sizes")
def create_size():
    administrator_id = _admin_required()
    item = AdminSizeService.create(json_body(), administrator_id=administrator_id)
    return success_response(item, status_code=201)


@sizes_bp.get("/sizes/<int:size_id>")
def get_size(size_id: int):
    _admin_required()
    return success_response(AdminSizeService.get_by_id(size_id))


@sizes_bp.put("/sizes/<int:size_id>")
def update_size(size_id: int):
    administrator_id = _admin_required()
    return success_response(
        AdminSizeService.update(size_id, json_body(), administrator_id=administrator_id)
    )


@sizes_bp.delete("/sizes/<int:size_id>")
def delete_size(size_id: int):
    administrator_id = _admin_required()
    return success_response(AdminSizeService.delete(size_id, administrator_id=administrator_id))


@sizes_bp.post("/sizes/<int:size_id>/restore")
def restore_size(size_id: int):
    administrator_id = _admin_required()
    return success_response(AdminSizeService.restore(size_id, administrator_id=administrator_id))


# Datos semilla: sólo lectura (§9.17, §9.18)
#
# `S-06` y `S-07` los declaran no administrables. Se exponen únicamente para que
# el panel pueda resolver `gender_id` y `size_type_id`, que `ProductCreateDTO` y
# el alta de talles exigen y la API pública no publica (`AD-12`, §4.8).
# Deliberadamente no hay POST, PUT ni DELETE.


@genders_bp.get("/genders")
def list_genders():
    """GET /api/v1/admin/genders (§9.17). Array de `GenderAdminDTO`."""
    _admin_required()
    page = AdminSeedDataService.list_genders(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())


@size_types_bp.get("/size-types")
def list_size_types():
    """GET /api/v1/admin/size-types (§9.18). Array de `SizeTypeAdminDTO`."""
    _admin_required()
    page = AdminSeedDataService.list_size_types(parse_page_request(request.args))
    return success_response([item.to_dict() for item in page.items], meta=page.to_meta())
