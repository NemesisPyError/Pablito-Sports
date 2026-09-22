"""Gestión de promociones (05_API.md §9.10, `CU-A-21`).

Reglas que materializa:

- `RN-36` — una promoción aplica a **como máximo uno** de producto, categoría o
  marca; sin ninguno de los tres, aplica a todos los productos (v1.6.0, pedido
  explícito del usuario). La forma la valida el schema; que la entidad exista,
  este servicio (cuando hay una); y la integridad real la garantiza el CHECK
  `scope_exclusive` de la tabla.
- `RN-33` — sin fecha de fin, la promoción rige indefinidamente.
- `DN-03` / `RN-38b` — descuentos simples. No hay 2x1, combos, topes ni cupones,
  y este servicio no debe adquirirlos.

**No hay regla de solapamiento.** `RN-37` resuelve la concurrencia en la lectura
aplicando el mayor descuento entre las vigentes, de modo que dos promociones
simultáneas sobre la misma entidad son un estado válido, no un conflicto. Ese
cálculo vive en `ProductRepository`, no aquí.

Toda escritura corre bajo `@transactional` (10_BACKEND.md §14.1) y deja registro
en `audit_logs` dentro de la misma transacción (`AD-20`, `CONS-05`).
"""

from ..core.audit import (
    ACTION_ACTIVATE,
    ACTION_CREATE,
    ACTION_DEACTIVATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AuditService,
)
from ..core.decorators import transactional
from ..core.exceptions import NotFoundError, RequestValidationError
from ..core.utils.pagination import Page
from ..mappers.admin_mappers import promotion_to_dto
from ..repositories.admin_classification_repository import (
    AdminBrandRepository,
    AdminCategoryRepository,
)
from ..repositories.admin_product_repository import AdminProductRepository
from ..repositories.promotion_repository import PromotionRepository

ENTITY_TYPE = "promotion"

# §14.2: snapshot selectivo.
AUDIT_FIELDS = (
    "name",
    "discount_percentage",
    "starts_at",
    "ends_at",
    "is_active",
    "product_id",
    "category_id",
    "brand_id",
    "deleted_at",
)

# Cada campo de alcance con el repositorio que sabe si su entidad existe. Se
# usan los administrativos, no los del catálogo público: una promoción puede
# apuntar a una entidad todavía inactiva, que el catálogo no vería.
_SCOPE_REPOSITORIES = {
    "product_id": AdminProductRepository,
    "category_id": AdminCategoryRepository,
    "brand_id": AdminBrandRepository,
}


class AdminPromotionService:
    @classmethod
    def list_paginated(cls, page_request) -> Page:
        """§9.10. Listado paginado de `PromotionDTO`."""
        total = PromotionRepository.count_all()
        promociones = PromotionRepository.list_all(
            offset=page_request.offset, limit=page_request.limit
        )
        return Page(
            items=[promotion_to_dto(item) for item in promociones],
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @classmethod
    def get_by_id(cls, promotion_id: int):
        return promotion_to_dto(cls._require(promotion_id))

    @classmethod
    @transactional
    def create(cls, entrada, *, administrator_id: int):
        """§9.10 `POST /promotions`."""
        cls._check_scope_exists(entrada)

        promocion = PromotionRepository.create(
            name=entrada.name,
            description=entrada.description,
            discount_percentage=entrada.discount_percentage,
            starts_at=entrada.starts_at,
            ends_at=entrada.ends_at,
            is_active=entrada.is_active,
            product_id=entrada.product_id,
            category_id=entrada.category_id,
            brand_id=entrada.brand_id,
        )
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type=ENTITY_TYPE,
            entity_id=promocion.id,
            new_values=AuditService.snapshot(promocion, AUDIT_FIELDS),
        )
        return promotion_to_dto(promocion)

    @classmethod
    @transactional
    def update(cls, promotion_id: int, entrada, *, administrator_id: int):
        """§9.10 `PUT /promotions/{id}`. Reemplazo completo, alcance incluido."""
        promocion = cls._require(promotion_id)
        cls._check_scope_exists(entrada)

        old_values = AuditService.snapshot(promocion, AUDIT_FIELDS)
        promocion = PromotionRepository.update(
            promocion,
            name=entrada.name,
            description=entrada.description,
            discount_percentage=entrada.discount_percentage,
            starts_at=entrada.starts_at,
            ends_at=entrada.ends_at,
            is_active=entrada.is_active,
            # El alcance se reemplaza entero: los tres campos se asignan para
            # que cambiar de categoría a marca deje limpio el anterior y el
            # CHECK `scope_exclusive` siga cumpliéndose.
            product_id=entrada.product_id,
            category_id=entrada.category_id,
            brand_id=entrada.brand_id,
        )
        AuditService.record(
            administrator_id=administrator_id,
            action=cls._accion_de_actualizacion(old_values, promocion),
            entity_type=ENTITY_TYPE,
            entity_id=promocion.id,
            old_values=old_values,
            new_values=AuditService.snapshot(promocion, AUDIT_FIELDS),
        )
        return promotion_to_dto(promocion)

    @classmethod
    @transactional
    def delete(cls, promotion_id: int, *, administrator_id: int):
        """§9.10 `DELETE /promotions/{id}`. Borrado lógico (`AD-18`)."""
        promocion = cls._require(promotion_id)

        old_values = AuditService.snapshot(promocion, AUDIT_FIELDS)
        # El DTO se arma antes del borrado: después, `promotion_to_dto` seguiría
        # funcionando, pero la respuesta debe describir lo que se eliminó.
        PromotionRepository.soft_delete(promocion)
        dto = promotion_to_dto(promocion)

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type=ENTITY_TYPE,
            entity_id=promocion.id,
            old_values=old_values,
            new_values=AuditService.snapshot(promocion, AUDIT_FIELDS),
        )
        return dto

    # ------------------------------------------------------------------
    # Reglas auxiliares
    # ------------------------------------------------------------------

    @classmethod
    def _require(cls, promotion_id: int):
        promocion = PromotionRepository.find_by_id(promotion_id)
        if promocion is None:
            raise NotFoundError("promotion not found", resource="promotion")
        return promocion

    @classmethod
    def _check_scope_exists(cls, entrada) -> None:
        """La entidad de destino debe existir.

        Sin esta comprobación, una referencia inventada llegaría a la FK y se
        convertiría en un 500. Se responde 422 con el campo, porque §10.9
        declara `product_id`/`category_id`/`brand_id` como validaciones del DTO
        y §11 exige que todo 409 cite un `RN-xx`: la existencia de la entidad no
        tiene regla de negocio propia.

        Sin campo de alcance poblado, la promoción aplica a todos los
        productos: no hay entidad que comprobar.
        """
        campo = entrada.scope_field
        if campo is None:
            return
        repositorio = _SCOPE_REPOSITORIES[campo]
        if repositorio.find_by_id(entrada.scope_id) is None:
            raise RequestValidationError(
                [{"field": campo, "detail": f"{campo} does not reference an existing entity"}]
            )

    @classmethod
    def _accion_de_actualizacion(cls, old_values: dict, promocion) -> str:
        """El conjunto de `action` es cerrado (03_SEGURIDAD.md §13.2)."""
        if old_values["is_active"] != promocion.is_active:
            return ACTION_ACTIVATE if promocion.is_active else ACTION_DEACTIVATE
        return ACTION_UPDATE
