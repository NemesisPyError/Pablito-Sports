"""Gestión de bancos del panel (Superdescuentos).

Mismo criterio que `admin_banner_service.py`: sin regla sobre posiciones
repetidas (se desempata por `id`, como en banners). Toda escritura corre bajo
`@transactional` y deja registro en `audit_logs` dentro de la misma
transacción (`AD-20`, `CONS-05`).
"""

from ..core.audit import (
    ACTION_ACTIVATE,
    ACTION_CREATE,
    ACTION_DEACTIVATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AuditService,
)
from ..core.decorators import schedule_file_deletion, transactional
from ..core.exceptions import NotFoundError
from ..core.utils.pagination import Page
from ..extensions import db
from ..mappers.admin_mappers import bank_to_admin_dto
from ..repositories.admin_bank_repository import AdminBankRepository

ENTITY_TYPE = "bank"

AUDIT_FIELDS = (
    "name",
    "discount_percentage",
    "image_path",
    "position",
    "is_active",
    "deleted_at",
)


class AdminBankService:
    @classmethod
    def list_paginated(cls, page_request) -> Page:
        total = AdminBankRepository.count_all()
        banks = AdminBankRepository.list_all(offset=page_request.offset, limit=page_request.limit)
        return Page(
            items=[bank_to_admin_dto(item) for item in banks],
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @classmethod
    def get_by_id(cls, bank_id: int):
        return bank_to_admin_dto(cls._require(bank_id))

    @classmethod
    @transactional
    def create(cls, entrada, *, image_path: str, administrator_id: int):
        """`image_path` llega ya almacenado: `AD-40` exige que el archivo se
        escriba antes que la fila, así que la carga ocurre en la ruta, fuera
        de esta transacción."""
        bank = AdminBankRepository.create(
            name=entrada.name,
            discount_percentage=entrada.discount_percentage,
            image_path=image_path,
            position=entrada.position,
            is_active=entrada.is_active,
        )
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type=ENTITY_TYPE,
            entity_id=bank.id,
            new_values=AuditService.snapshot(bank, AUDIT_FIELDS),
        )
        return bank_to_admin_dto(bank)

    @classmethod
    @transactional
    def update(cls, bank_id: int, entrada, *, image_path: str | None, administrator_id: int):
        """La imagen puede omitirse si no se reemplaza: un `image_path` nulo
        significa "conservar la actual", no "borrarla"."""
        bank = cls._require(bank_id)
        old_values = AuditService.snapshot(bank, AUDIT_FIELDS)

        campos = {
            "name": entrada.name,
            "discount_percentage": entrada.discount_percentage,
            "position": entrada.position,
            "is_active": entrada.is_active,
        }
        anterior = bank.image_path
        if image_path is not None:
            campos["image_path"] = image_path

        bank = AdminBankRepository.update(bank, **campos)

        # Al reemplazar la imagen, la anterior se retira sólo si ningún otro
        # banco vivo la referencia, y sólo cuando la transacción confirme.
        if image_path is not None and anterior and anterior != image_path:
            db.session.flush()
            if AdminBankRepository.count_live_with_path(anterior, excluding_id=bank.id) == 0:
                schedule_file_deletion(anterior)
        AuditService.record(
            administrator_id=administrator_id,
            action=cls._accion_de_actualizacion(old_values, bank),
            entity_type=ENTITY_TYPE,
            entity_id=bank.id,
            old_values=old_values,
            new_values=AuditService.snapshot(bank, AUDIT_FIELDS),
        )
        return bank_to_admin_dto(bank)

    @classmethod
    @transactional
    def delete(cls, bank_id: int, *, administrator_id: int):
        """Borrado lógico (`AD-18`). El archivo de imagen sí se retira, si
        ningún otro banco vivo lo sigue usando."""
        bank = cls._require(bank_id)
        old_values = AuditService.snapshot(bank, AUDIT_FIELDS)
        ruta = bank.image_path

        AdminBankRepository.soft_delete(bank)
        db.session.flush()
        if ruta and AdminBankRepository.count_live_with_path(ruta, excluding_id=bank.id) == 0:
            schedule_file_deletion(ruta)
        dto = bank_to_admin_dto(bank)

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type=ENTITY_TYPE,
            entity_id=bank.id,
            old_values=old_values,
            new_values=AuditService.snapshot(bank, AUDIT_FIELDS),
        )
        return dto

    # ------------------------------------------------------------------

    @classmethod
    def _require(cls, bank_id: int):
        bank = AdminBankRepository.find_by_id(bank_id)
        if bank is None:
            raise NotFoundError("bank not found", resource="bank")
        return bank

    @classmethod
    def _accion_de_actualizacion(cls, old_values: dict, bank) -> str:
        if old_values["is_active"] != bank.is_active:
            return ACTION_ACTIVATE if bank.is_active else ACTION_DEACTIVATE
        return ACTION_UPDATE
