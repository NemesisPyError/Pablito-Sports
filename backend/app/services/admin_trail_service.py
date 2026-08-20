"""Lectura de los dos rastros del panel: auditoría e historial de precios.

05_API.md §9.15 (`AD-20`) y §9.16 (`RN-70`). Ambos son **solo lectura**: no
abren transacción (10_BACKEND.md §14.1 regla 3) y son inmutables por
construcción — ningún método aquí escribe.

`ADP-10` sigue abierto: ninguno de los dos rastros se declara autoridad frente
al otro ante discrepancia. Este servicio se limita a exponerlos.
"""

from ..core.utils.pagination import Page
from ..mappers.admin_mappers import audit_log_to_dto, price_history_to_dto
from ..repositories.audit_log_repository import AuditLogRepository
from ..repositories.price_history_repository import PriceHistoryRepository


class AuditTrailService:
    @classmethod
    def list_audit_logs(cls, query) -> Page:
        """§9.15. Devuelve `AuditLogDTO` paginados."""
        criteria = {
            "entity_type": query.entity_type,
            "entity_id": query.entity_id,
            "administrator_id": query.administrator_id,
            "actions": query.actions,
            "created_from": query.created_from,
            "created_to": query.created_to,
        }
        total = AuditLogRepository.count_all(**criteria)
        entries = AuditLogRepository.list_all(
            offset=query.page.offset, limit=query.page.limit, **criteria
        )
        return Page(
            items=[audit_log_to_dto(entry) for entry in entries],
            page=query.page.page,
            per_page=query.page.per_page,
            total=total,
        )

    @classmethod
    def list_price_history(cls, query) -> Page:
        """§9.16. Devuelve `PriceHistoryDTO` paginados."""
        criteria = {
            "product_id": query.product_id,
            "administrator_id": query.administrator_id,
            "created_from": query.created_from,
            "created_to": query.created_to,
        }
        total = PriceHistoryRepository.count_all(**criteria)
        entries = PriceHistoryRepository.list_all(
            offset=query.page.offset, limit=query.page.limit, **criteria
        )
        return Page(
            items=[price_history_to_dto(entry) for entry in entries],
            page=query.page.page,
            per_page=query.page.per_page,
            total=total,
        )
