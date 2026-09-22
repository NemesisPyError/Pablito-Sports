"""Registro de ventas (RN-82, 04_BASE_DATOS.md v2.6.0-relacionado).

El registro es **inmutable** (mismo patrón que `price_history_repository.py`,
RN-70): este repositorio solo inserta y consulta. No expone actualización ni
borrado, ni siquiera lógico.
"""

from ..extensions import db
from ..models import Sale, SaleOrder


class SaleRepository:
    @classmethod
    def create_order(cls, *, administrator_id: int, total_amount: int) -> SaleOrder:
        """Cabecera de una venta manual, en la transacción ya abierta.

        Se inserta **antes** que sus líneas porque estas la referencian. El
        `flush()` es lo que le da un `id` utilizable sin cerrar la transacción.
        """
        order = SaleOrder(administrator_id=administrator_id, total_amount=total_amount)
        db.session.add(order)
        db.session.flush()
        return order

    @classmethod
    def record(
        cls,
        *,
        variant_id: int,
        quantity: int,
        administrator_id: int,
        sale_order_id: int | None = None,
        unit_price: int | None = None,
    ) -> Sale:
        """Añade la fila a la sesión abierta, sin cerrarla.

        El insert va en la misma transacción que el descuento de
        `variants.quantity`; cerrarla es responsabilidad del servicio
        (10_BACKEND.md §14.1).

        `sale_order_id` y `unit_price` son opcionales por compatibilidad con las
        ventas de una sola variante, que no pasan por una cabecera. Una línea
        sin precio significa "registrada antes de que existiera el snapshot",
        no "vendida a cero".
        """
        entry = Sale(
            variant_id=variant_id,
            quantity=quantity,
            administrator_id=administrator_id,
            sale_order_id=sale_order_id,
            unit_price=unit_price,
        )
        db.session.add(entry)
        db.session.flush()
        return entry
