"""Collage de marca del panel (05_API.md §9.6, v1.1.0).

El bloque de marca de la portada muestra entre 2 y 4 piezas. **El límite no
vive en la tabla**: es una regla de presentación, y una restricción de esquema
volvería costoso cambiarla cuando cambie el diseño (04 §9.2.18). Se valida acá,
que es donde viven las reglas de negocio.

El mínimo de 2 **no se exige**: una marca a medio cargar es un estado de trabajo
legítimo del administrador; el catálogo simplemente no publica el bloque hasta
que tenga piezas suficientes.

Toda escritura corre bajo `@transactional` (10_BACKEND.md §14.1) y deja registro
en `audit_logs` dentro de la misma transacción (`AD-20`, `CONS-05`).
"""

from ..core.audit import ACTION_CREATE, ACTION_DELETE, ACTION_UPDATE, AuditService
from ..core.decorators import transactional
from ..core.exceptions import BusinessRuleError, NotFoundError, RequestValidationError
from ..core.utils.urls import public_file_url
from ..repositories.admin_brand_image_repository import AdminBrandImageRepository
from ..repositories.admin_classification_repository import AdminBrandRepository

ENTITY_TYPE = "brand_image"

# Lo que el diseño de la portada admite en un collage (09_COMPONENTES.md §9.8).
MAX_COLLAGE_IMAGES = 4

MAX_ALT_TEXT_LENGTH = 255

AUDIT_FIELDS = ("brand_id", "file_path", "position", "alt_text", "is_active", "deleted_at")


class AdminBrandImageService:
    @classmethod
    def list_by_brand(cls, brand_id: int) -> list[dict]:
        """§9.6 `GET /admin/brands/{id}/images`."""
        cls._require_brand(brand_id)
        return [cls._to_dto(image) for image in AdminBrandImageRepository.list_by_brand(brand_id)]

    @classmethod
    @transactional
    def add(cls, brand_id: int, *, file_path: str, alt_text: str | None, administrator_id: int):
        """§9.6 `POST /admin/brands/{id}/images`.

        `file_path` llega ya almacenado: `AD-40` exige que el archivo se escriba
        antes que la fila, así que la carga ocurre en la ruta.

        La pieza se agrega **al final**: reordenar es una operación aparte y
        explícita, no un efecto de cargar.
        """
        cls._require_brand(brand_id)

        if AdminBrandImageRepository.count_active(brand_id) >= MAX_COLLAGE_IMAGES:
            raise BusinessRuleError(
                f"a brand collage holds at most {MAX_COLLAGE_IMAGES} images",
                rule="collage_max",
                field="images",
            )

        existentes = AdminBrandImageRepository.list_by_brand(brand_id)
        siguiente = max((imagen.position for imagen in existentes), default=-1) + 1

        image = AdminBrandImageRepository.create(
            brand_id=brand_id,
            file_path=file_path,
            position=siguiente,
            alt_text=cls._alt_text(alt_text),
        )
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type=ENTITY_TYPE,
            entity_id=image.id,
            new_values=AuditService.snapshot(image, AUDIT_FIELDS),
        )
        return cls._to_dto(image)

    @classmethod
    @transactional
    def reorder(cls, brand_id: int, image_ids: list, *, administrator_id: int):
        """§9.6 `PUT /admin/brands/{id}/images/order`.

        El cliente envía **todas** las piezas en el orden deseado. Aceptar un
        subconjunto dejaría posiciones ambiguas entre las enviadas y las
        omitidas, así que una lista incompleta es `422`.
        """
        cls._require_brand(brand_id)
        actuales = AdminBrandImageRepository.list_by_brand(brand_id)

        cls._validar_orden(image_ids, actuales)

        por_id = {imagen.id: imagen for imagen in actuales}
        for posicion, image_id in enumerate(image_ids):
            imagen = por_id[image_id]
            if imagen.position == posicion:
                continue
            old_values = AuditService.snapshot(imagen, AUDIT_FIELDS)
            AdminBrandImageRepository.update(imagen, position=posicion)
            AuditService.record(
                administrator_id=administrator_id,
                action=ACTION_UPDATE,
                entity_type=ENTITY_TYPE,
                entity_id=imagen.id,
                old_values=old_values,
                new_values=AuditService.snapshot(imagen, AUDIT_FIELDS),
            )

        return [cls._to_dto(imagen) for imagen in AdminBrandImageRepository.list_by_brand(brand_id)]

    @classmethod
    @transactional
    def delete(cls, brand_id: int, image_id: int, *, administrator_id: int):
        """§9.6 `DELETE /admin/brands/{id}/images/{image_id}`. Borrado lógico.

        El archivo **no se toca**: `AD-39` acota la limpieza física a los
        archivos sin fila, y esta fila sigue existiendo.
        """
        cls._require_brand(brand_id)
        imagen = AdminBrandImageRepository.find_by_id(image_id, brand_id)
        if imagen is None:
            raise NotFoundError("brand image not found", resource=ENTITY_TYPE)

        old_values = AuditService.snapshot(imagen, AUDIT_FIELDS)
        AdminBrandImageRepository.soft_delete(imagen)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type=ENTITY_TYPE,
            entity_id=imagen.id,
            old_values=old_values,
            new_values=AuditService.snapshot(imagen, AUDIT_FIELDS),
        )

    # ------------------------------------------------------------------

    @staticmethod
    def _require_brand(brand_id: int):
        brand = AdminBrandRepository.find_by_id(brand_id)
        if brand is None:
            raise NotFoundError("brand not found", resource="brand")
        return brand

    @staticmethod
    def _alt_text(valor: str | None) -> str | None:
        texto = (valor or "").strip()
        if not texto:
            return None
        if len(texto) > MAX_ALT_TEXT_LENGTH:
            raise RequestValidationError(
                [
                    {
                        "field": "alt_text",
                        "detail": f"alt_text must be at most {MAX_ALT_TEXT_LENGTH} characters",
                    }
                ]
            )
        return texto

    @staticmethod
    def _validar_orden(image_ids, actuales):
        if not isinstance(image_ids, list) or not all(
            isinstance(valor, int) and not isinstance(valor, bool) for valor in image_ids
        ):
            raise RequestValidationError(
                [{"field": "image_ids", "detail": "image_ids must be a list of integers"}]
            )

        enviados = list(image_ids)
        if len(set(enviados)) != len(enviados):
            raise RequestValidationError(
                [{"field": "image_ids", "detail": "image_ids must not repeat"}]
            )

        if set(enviados) != {imagen.id for imagen in actuales}:
            raise RequestValidationError(
                [
                    {
                        "field": "image_ids",
                        "detail": "image_ids must contain every image of the brand exactly once",
                    }
                ]
            )

    @staticmethod
    def _to_dto(image) -> dict:
        """`BrandImageAdminDTO` (§10.7). Lleva `id`: §4.8 lo admite en privado."""
        return {
            "id": image.id,
            "image_url": public_file_url(image.file_path),
            "alt_text": image.alt_text,
            "position": image.position,
            "is_active": image.is_active,
        }
