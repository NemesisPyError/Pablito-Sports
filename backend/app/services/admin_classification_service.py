"""Admin CRUD rules for classification entities (05_API.md §9).

Toda escritura corre bajo `@transactional` (10_BACKEND.md §14.1) y deja registro
en `audit_logs` dentro de la misma transacción (`AD-20`, `CONS-05`).

El identificador del administrador llega como argumento desde la ruta: §8.4
prohíbe que un servicio conozca HTTP, así que no puede leer la sesión por su
cuenta.
"""

from ..core.audit import (
    ACTION_ACTIVATE,
    ACTION_CREATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AuditService,
)
from ..core.decorators import schedule_file_deletion, transactional
from ..core.exceptions import BusinessRuleError, NotFoundError, RequestValidationError
from ..core.utils.pagination import Page
from ..core.utils.urls import public_file_url
from ..extensions import db
from ..repositories.admin_classification_repository import (
    AdminBrandRepository,
    AdminCategoryRepository,
    AdminSizeRepository,
    AdminSportRepository,
)
from ..repositories.gender_repository import GenderRepository
from ..repositories.product_repository import ProductRepository
from ..schemas.shared import texto

# §14.2: el snapshot de auditoría es selectivo. Las marcas de tiempo quedan
# fuera porque las mantiene la base, no el administrador.
AUDIT_EXCLUDED_FIELDS = ("created_at", "updated_at")


class AdminClassificationService:
    repo = None
    entity_label = "Entidad"
    entity_type = "classification"

    # §10.13 y 04 §9.2: cada clasificación tiene su propio máximo. Las subclases
    # que no coinciden con este lo redefinen.
    max_name_length = 100
    max_slug_length = 100

    @classmethod
    def list_paginated(cls, page: int, per_page: int):
        total = cls.repo.count_all()
        offset = (page - 1) * per_page
        items = cls.repo.list_all(offset=offset, limit=per_page)
        return Page(
            items=[cls._to_admin_dto(item) for item in items],
            page=page,
            per_page=per_page,
            total=total,
        )

    @classmethod
    def get_by_id(cls, entity_id: int):
        entity = cls.repo.find_by_id(entity_id)
        if entity is None:
            raise NotFoundError(f"{cls.entity_type} not found", resource=cls.entity_type)
        return cls._to_admin_dto(entity)

    @classmethod
    @transactional
    def create(cls, payload: dict, *, administrator_id: int):
        cls._validate(payload)
        fields = cls._fields_from_payload(payload)
        if cls.repo.find_by_slug(fields["slug"]):
            # AD-19, RN-79: el slug nunca se reutiliza, ni tras el borrado lógico.
            raise BusinessRuleError("slug already in use", rule="RN-79", field="slug")
        entity = cls.repo.create(**fields)
        dto = cls._to_admin_dto(entity)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type=cls.entity_type,
            entity_id=entity.id,
            new_values=cls._audit_snapshot(entity),
        )
        return dto

    @classmethod
    @transactional
    def update(cls, entity_id: int, payload: dict, *, administrator_id: int):
        entity = cls.repo.find_by_id(entity_id)
        if entity is None:
            raise NotFoundError(f"{cls.entity_type} not found", resource=cls.entity_type)
        cls._validate(payload, entity_id=entity_id)
        fields = cls._fields_from_payload(payload)
        duplicate = cls.repo.find_by_slug(fields["slug"], exclude_id=entity_id)
        if duplicate is not None and duplicate.deleted_at is None:
            raise BusinessRuleError("slug already in use", rule="RN-79", field="slug")
        # El snapshot previo se toma antes de mutar la entidad (§14.2).
        old_values = cls._audit_snapshot(entity)
        entity = cls.repo.update(entity, **fields)
        dto = cls._to_admin_dto(entity)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type=cls.entity_type,
            entity_id=entity.id,
            old_values=old_values,
            new_values=cls._audit_snapshot(entity),
        )
        return dto

    @classmethod
    @transactional
    def delete(cls, entity_id: int, *, administrator_id: int):
        entity = cls.repo.find_by_id(entity_id)
        if entity is None:
            raise NotFoundError(f"{cls.entity_type} not found", resource=cls.entity_type)
        cls._check_dependencies(entity)
        old_values = cls._audit_snapshot(entity)
        cls.repo.soft_delete(entity)
        dto = cls._to_admin_dto(entity)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type=cls.entity_type,
            entity_id=entity.id,
            old_values=old_values,
            new_values=cls._audit_snapshot(entity),
        )
        return dto

    @classmethod
    @transactional
    def restore(cls, entity_id: int, *, administrator_id: int):
        # Hay que poder verla eliminada para poder restaurarla.
        entity = cls.repo.find_by_id(entity_id, include_deleted=True)
        if entity is None or entity.deleted_at is None:
            raise NotFoundError(f"{cls.entity_type} not found", resource=cls.entity_type)
        old_values = cls._audit_snapshot(entity)
        cls.repo.restore(entity)
        dto = cls._to_admin_dto(entity)
        # `restore` no tiene acción propia: el conjunto de `action` es cerrado
        # (03_SEGURIDAD.md §13.2 y CHECK `action_allowed`). Se registra como
        # `activate`, que es lo que la restauración hace con la entidad.
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_ACTIVATE,
            entity_type=cls.entity_type,
            entity_id=entity.id,
            old_values=old_values,
            new_values=cls._audit_snapshot(entity),
        )
        return dto

    @classmethod
    def _validate(cls, payload: dict, entity_id: int | None = None):
        """§11: un payload que no cumple el esquema es `422`, nunca `500`.

        Los máximos son los que §10.13 documenta para cada `*CreateDTO`, y
        coinciden con el `VARCHAR` de 04 §9.2. Sin esta comprobación, un nombre
        demasiado largo llegaba a PostgreSQL y el error de columna se traducía
        en un `500` opaco: el cliente no podía saber qué había hecho mal.
        """
        # S-13: `texto()` rechaza el tipo en vez de convertirlo. Antes,
        # `{"name": 123}` llegaba a `.strip()` y devolvía 500 en lugar de 422.
        errores: list[dict] = []
        texto(payload, "name", errores, maximo=cls.max_name_length)
        texto(payload, "slug", errores, maximo=cls.max_slug_length)

        if errores:
            raise RequestValidationError(errores)

    @classmethod
    def _fields_from_payload(cls, payload: dict) -> dict:
        # Los tipos ya los validó `_validate_payload`, que corre antes.
        return {
            "name": payload["name"].strip(),
            "slug": payload["slug"].strip(),
            "is_active": payload.get("is_active", True),
        }

    @classmethod
    def _to_admin_dto(cls, entity) -> dict:
        """Salida administrativa. §10.7 `CategoryAdminDTO` incluye las marcas.

        `created_at` y `updated_at` existen en todas las clasificaciones vía
        `TimestampMixin` y no son datos sensibles: describen la fila, no a una
        persona. Estas rutas ya exigen sesión administrativa (`PA-06`), y `AD-12`
        no aplica porque los DTO públicos (§7.5 a §7.11) no se tocan.
        """
        return {
            "id": entity.id,
            "name": entity.name,
            "slug": entity.slug,
            "is_active": entity.is_active,
            "created_at": entity.created_at.isoformat(),
            "updated_at": entity.updated_at.isoformat(),
            "deleted_at": entity.deleted_at.isoformat() if entity.deleted_at else None,
        }

    @classmethod
    def _audit_snapshot(cls, entity) -> dict:
        """Snapshot para `audit_logs` (§14.2): sin marcas de tiempo.

        `updated_at` cambia en **toda** escritura, de modo que incluirla haría
        que cada entrada de auditoría mostrara una diferencia que el
        administrador no decidió. Mismo criterio que `AUDIT_FIELDS` en banners.

        Se deriva del DTO para no perder lo que añaden las subclases
        —`parent_id`, `hex_code`, `size_type_id`—, que sí son cambios reales.
        """
        return {
            clave: valor
            for clave, valor in cls._to_admin_dto(entity).items()
            if clave not in AUDIT_EXCLUDED_FIELDS
        }

    @classmethod
    def _check_dependencies(cls, entity):
        pass


class AdminBrandService(AdminClassificationService):
    repo = AdminBrandRepository
    entity_label = "Marca"
    entity_type = "brand"

    # 04 §9.2.3 (v1.1.0).
    max_tagline_length = 255

    @classmethod
    def _check_dependencies(cls, entity):
        if ProductRepository.count_by_brand(entity.id) > 0:
            raise BusinessRuleError("brand has associated products", rule="RN-68")

    @classmethod
    def _validate(cls, payload: dict, entity_id: int | None = None):
        """Suma la validación de los campos de portada (v1.1.0).

        El logotipo no se valida acá: viaja por su propio recurso, porque es un
        archivo y no un campo de forma (§9.6).
        """
        super()._validate(payload, entity_id=entity_id)

        errores = []

        tagline = texto(payload, "tagline", [], requerido=False)
        if len(tagline) > cls.max_tagline_length:
            errores.append(
                {
                    "field": "tagline",
                    "detail": f"tagline must be at most {cls.max_tagline_length} characters",
                }
            )

        crudo = payload.get("home_position")
        if crudo is not None and str(crudo).strip() != "":
            # `bool` es subclase de `int`: `True` no es una posición.
            if isinstance(crudo, bool):
                errores.append(
                    {"field": "home_position", "detail": "home_position must be an integer"}
                )
            else:
                try:
                    posicion = int(str(crudo).strip())
                except (TypeError, ValueError):
                    errores.append(
                        {"field": "home_position", "detail": "home_position must be an integer"}
                    )
                else:
                    # 04 §9.2.3: `CHECK (home_position IS NULL OR home_position >= 0)`.
                    if posicion < 0:
                        errores.append(
                            {
                                "field": "home_position",
                                "detail": "home_position must be 0 or greater",
                            }
                        )

        if errores:
            raise RequestValidationError(errores)

    @classmethod
    def _fields_from_payload(cls, payload: dict) -> dict:
        fields = super()._fields_from_payload(payload)
        fields["tagline"] = (payload.get("tagline") or "").strip() or None

        crudo = payload.get("home_position")
        # Vacío o ausente significa «no tiene bloque propio en la portada», que
        # es distinto de la posición 0: esa es la primera marca destacada.
        if crudo is None or str(crudo).strip() == "":
            fields["home_position"] = None
        else:
            fields["home_position"] = int(str(crudo).strip())

        # Franja de marcas. Ausente = `True`, no `False`: la columna nace en
        # `TRUE` (migración `a1c4e77b90d2`) y un cliente que no conozca el campo
        # no debe sacar marcas de la franja sin querer.
        fields["show_in_strip"] = bool(payload.get("show_in_strip", True))

        return fields

    @classmethod
    def _to_admin_dto(cls, entity) -> dict:
        dto = super()._to_admin_dto(entity)
        dto["image_url"] = public_file_url(entity.image_path)
        dto["tagline"] = entity.tagline
        dto["home_position"] = entity.home_position
        dto["show_in_strip"] = entity.show_in_strip
        return dto

    @classmethod
    @transactional
    def set_image(cls, brand_id: int, image_path: str | None, *, administrator_id: int):
        """§9.6 `PUT` / `DELETE /admin/brands/{id}/image` (v1.1.0).

        El logotipo es un recurso propio y no un campo del `PUT` de la marca:
        el CRUD de clasificaciones es JSON y volverlo `multipart` por un campo
        obligaría a enviar el archivo en cada renombrado.

        `image_path` nulo borra la referencia. post-S13: el archivo anterior se
        retira del volumen salvo que otra fila viva lo use — el logotipo y las
        piezas del collage comparten el espacio `brands/<id>/`, así que el
        recuento cruza las dos tablas.
        """
        entity = cls.repo.find_by_id(brand_id)
        if entity is None:
            raise NotFoundError("brand not found", resource=cls.entity_type)

        old_values = cls._audit_snapshot(entity)
        anterior = entity.image_path
        entity = cls.repo.update(entity, image_path=image_path)

        if anterior and anterior != image_path:
            db.session.flush()
            from ..repositories.admin_brand_image_repository import AdminBrandImageRepository

            if (
                AdminBrandImageRepository.count_live_references_to_brand_logo(
                    anterior, excluding_brand_id=entity.id
                )
                == 0
            ):
                schedule_file_deletion(anterior)

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type=cls.entity_type,
            entity_id=entity.id,
            old_values=old_values,
            new_values=cls._audit_snapshot(entity),
        )
        return cls._to_admin_dto(entity)


class AdminCategoryService(AdminClassificationService):
    repo = AdminCategoryRepository
    entity_label = "Categoría"
    entity_type = "category"

    @classmethod
    def _fields_from_payload(cls, payload: dict) -> dict:
        fields = super()._fields_from_payload(payload)
        fields["parent_id"] = payload.get("parent_id") or None
        # RN-83: los sexos son una relación, no una columna, pero el repositorio
        # hace `setattr` sobre la entidad y SQLAlchemy sincroniza la N:M sola,
        # así que viajan con el resto de los campos. `PUT` reemplaza la lista
        # completa, igual que el resto del recurso (§10.13).
        fields["genders"] = cls._resolve_genders(payload)
        return fields

    @classmethod
    def _resolve_genders(cls, payload: dict) -> list:
        """RN-83, AD-41: `gender_ids` es opcional y la lista vacía es válida.

        Ausente o vacía significa «sin restricción», no «ningún sexo»: la
        categoría se ofrece en todos los ejes de la navegación. Un identificador
        inexistente sí es un error del cliente y corta con `422`, en lugar de
        colarse como `None` dentro de la relación.
        """
        gender_ids = payload.get("gender_ids") or []
        if not isinstance(gender_ids, list):
            raise RequestValidationError(
                [{"field": "gender_ids", "detail": "gender_ids must be a list"}]
            )

        generos = []
        for gender_id in gender_ids:
            # Un valor que no es un entero se rechaza acá y no en la consulta:
            # llegar al repositorio con `"abc"` produce un error de base de
            # datos, que es un 500 para el cliente cuando en realidad mandó mal
            # el dato (`ERR-04`).
            try:
                identificador = int(gender_id)
            except (TypeError, ValueError):
                identificador = None

            genero = GenderRepository.find_by_id(identificador) if identificador else None
            if genero is None:
                raise RequestValidationError(
                    [{"field": "gender_ids", "detail": f"gender {gender_id!r} not found"}]
                )
            if genero not in generos:
                generos.append(genero)
        return generos

    @classmethod
    def _to_admin_dto(cls, entity) -> dict:
        dto = super()._to_admin_dto(entity)
        dto["parent_id"] = entity.parent_id
        dto["gender_ids"] = [genero.id for genero in entity.genders]
        return dto

    @classmethod
    def _check_dependencies(cls, entity):
        if ProductRepository.count_by_category(entity.id) > 0:
            raise BusinessRuleError("category has associated products", rule="RN-68")
        # `Category.children` no filtra el borrado lógico, así que una hija ya
        # eliminada seguía bloqueando a la madre: para el administrador esa
        # subcategoría no existe, pero RN-68 la contaba igual y dejaba la
        # categoría imposible de borrar sin explicación visible. Solo las hijas
        # vivas son una dependencia real.
        if any(hija.deleted_at is None for hija in entity.children):
            raise BusinessRuleError("category has child categories", rule="RN-68")


class AdminSportService(AdminClassificationService):
    repo = AdminSportRepository
    entity_label = "Deporte"
    entity_type = "sport"

    @classmethod
    def _check_dependencies(cls, entity):
        if ProductRepository.count_by_sport(entity.id) > 0:
            raise BusinessRuleError("sport has associated products", rule="RN-68")


class AdminSizeService(AdminClassificationService):
    repo = AdminSizeRepository
    # §10.13: `SizeCreateDTO` acota a 20.
    max_name_length = 20
    max_slug_length = 20
    entity_label = "Talle"
    entity_type = "size"

    @classmethod
    def _fields_from_payload(cls, payload: dict) -> dict:
        fields = super()._fields_from_payload(payload)
        fields["size_type_id"] = payload.get("size_type_id")
        if not fields.get("size_type_id"):
            raise RequestValidationError(
                [{"field": "size_type_id", "detail": "size_type_id is required"}]
            )
        return fields

    @classmethod
    def _to_admin_dto(cls, entity) -> dict:
        dto = super()._to_admin_dto(entity)
        dto["size_type_id"] = entity.size_type_id
        dto["size_type"] = {"slug": entity.size_type.slug, "name": entity.size_type.name}
        return dto

    @classmethod
    def _check_dependencies(cls, entity):
        if ProductRepository.count_by_size(entity.id) > 0:
            raise BusinessRuleError("size has associated products", rule="RN-68")
