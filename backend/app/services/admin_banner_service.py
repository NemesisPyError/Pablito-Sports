"""Gestión de banners del panel (05_API.md §9.11, `CU-A-22`).

Reglas que materializa:

- `RN-73` — el banner tiene orden de aparición, vigencia y estado activo. Los
  tres son campos propios; ninguno se deriva de otra cosa.
- `RN-74` — un banner sin vigencia definida es permanente mientras esté activo.
  Por eso `starts_at` y `ends_at` son opcionales, a diferencia de las
  promociones, donde `starts_at` es obligatorio.

**No hay regla sobre posiciones repetidas ni sobre solapamiento de vigencias.**
Dos banners pueden compartir `position`, y el orden se desempata por `id`. No se
inventa unicidad donde el documento no la pide.

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
from ..core.exceptions import NotFoundError
from ..core.utils.pagination import Page
from ..mappers.admin_mappers import banner_to_admin_dto
from ..models import BANNER_PLACEMENT_VALUES
from ..repositories.admin_banner_repository import AdminBannerRepository

ENTITY_TYPE = "banner"

# §14.2: snapshot selectivo.
AUDIT_FIELDS = (
    "title",
    "subtitle",
    "image_path",
    "link_url",
    "button_label",
    "placement",
    "position",
    "starts_at",
    "ends_at",
    "is_active",
    "deleted_at",
)


class AdminBannerService:
    @classmethod
    def list_paginated(cls, page_request, placement: str | None = None) -> Page:
        """§9.11. Listado paginado de `BannerAdminDTO`.

        `placement` acota la zona. Un valor desconocido se ignora, como en el
        listado público: es una lectura, y el peor caso es ver de más.
        """
        zona = placement if placement in BANNER_PLACEMENT_VALUES else None
        total = AdminBannerRepository.count_all(placement=zona)
        banners = AdminBannerRepository.list_all(
            offset=page_request.offset, limit=page_request.limit, placement=zona
        )
        return Page(
            items=[banner_to_admin_dto(item) for item in banners],
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @classmethod
    def get_by_id(cls, banner_id: int):
        return banner_to_admin_dto(cls._require(banner_id))

    @classmethod
    @transactional
    def create(cls, entrada, *, image_path: str, administrator_id: int):
        """§9.11 `POST /banners`.

        `image_path` llega ya almacenado: `AD-40` exige que el archivo se escriba
        antes que la fila, así que la carga ocurre en la ruta, fuera de esta
        transacción. Si la transacción falla, queda un archivo sin fila, que es
        exactamente lo que `AD-39` contempla limpiar.
        """
        banner = AdminBannerRepository.create(
            title=entrada.title,
            subtitle=entrada.subtitle,
            image_path=image_path,
            link_url=entrada.link_url,
            button_label=entrada.button_label,
            placement=entrada.placement,
            position=entrada.position,
            starts_at=entrada.starts_at,
            ends_at=entrada.ends_at,
            is_active=entrada.is_active,
        )
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type=ENTITY_TYPE,
            entity_id=banner.id,
            new_values=AuditService.snapshot(banner, AUDIT_FIELDS),
        )
        return banner_to_admin_dto(banner)

    @classmethod
    @transactional
    def update(cls, banner_id: int, entrada, *, image_path: str | None, administrator_id: int):
        """§9.11 `PUT /banners/{id}`.

        §10.13: en `PUT` la imagen **puede omitirse si no se reemplaza**. Un
        `image_path` nulo significa "conservar la actual", no "borrarla".
        """
        banner = cls._require(banner_id)
        old_values = AuditService.snapshot(banner, AUDIT_FIELDS)

        campos = {
            "title": entrada.title,
            "subtitle": entrada.subtitle,
            "link_url": entrada.link_url,
            "button_label": entrada.button_label,
            "placement": entrada.placement,
            "position": entrada.position,
            "starts_at": entrada.starts_at,
            "ends_at": entrada.ends_at,
            "is_active": entrada.is_active,
        }
        if image_path is not None:
            campos["image_path"] = image_path

        banner = AdminBannerRepository.update(banner, **campos)
        AuditService.record(
            administrator_id=administrator_id,
            action=cls._accion_de_actualizacion(old_values, banner),
            entity_type=ENTITY_TYPE,
            entity_id=banner.id,
            old_values=old_values,
            new_values=AuditService.snapshot(banner, AUDIT_FIELDS),
        )
        return banner_to_admin_dto(banner)

    @classmethod
    @transactional
    def delete(cls, banner_id: int, *, administrator_id: int):
        """§9.11 `DELETE /banners/{id}`. Borrado lógico (`AD-18`).

        El archivo de imagen **no se toca**: `AD-39` acota la limpieza física a
        los archivos sin fila, y esta fila sigue existiendo.
        """
        banner = cls._require(banner_id)
        old_values = AuditService.snapshot(banner, AUDIT_FIELDS)

        AdminBannerRepository.soft_delete(banner)
        dto = banner_to_admin_dto(banner)

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type=ENTITY_TYPE,
            entity_id=banner.id,
            old_values=old_values,
            new_values=AuditService.snapshot(banner, AUDIT_FIELDS),
        )
        return dto

    # ------------------------------------------------------------------

    @classmethod
    def _require(cls, banner_id: int):
        banner = AdminBannerRepository.find_by_id(banner_id)
        if banner is None:
            raise NotFoundError("banner not found", resource="banner")
        return banner

    @classmethod
    def _accion_de_actualizacion(cls, old_values: dict, banner) -> str:
        """El conjunto de `action` es cerrado (03_SEGURIDAD.md §13.2)."""
        if old_values["is_active"] != banner.is_active:
            return ACTION_ACTIVATE if banner.is_active else ACTION_DEACTIVATE
        return ACTION_UPDATE
