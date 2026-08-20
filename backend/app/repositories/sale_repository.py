"""Registro de ventas (RN-82, 04_BASE_DATOS.md v2.6.0-relacionado).

El registro es **inmutable** (mismo patrón que `price_history_repository.py`,
RN-70): este repositorio solo inserta y consulta. No expone actualización ni
borrado, ni siquiera lógico.
"""

from ..extensions import db
from ..models import Sale


class SaleRepository:
    @classmethod
    def record(cls, *, variant_id: int, quantity: int, administrator_id: int) -> Sale:
        """Añade la fila a la sesión abierta, sin cerrarla.

        El insert va en la misma transacción que el descuento de
        `variants.quantity`; cerrarla es responsabilidad del servicio
        (10_BACKEND.md §14.1).
        """
        entry = Sale(variant_id=variant_id, quantity=quantity, administrator_id=administrator_id)
        db.session.add(entry)
        db.session.flush()
        return entry
