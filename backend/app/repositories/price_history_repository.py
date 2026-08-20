"""Historial de precios (RN-70, 04_BASE_DATOS.md §15).

El historial es **inmutable** (§15.3 regla 3): este repositorio solo inserta y
consulta. No expone actualización ni borrado, ni siquiera lógico.

**Alcance.** Registra los cambios de `list_price`. `price_history` (§9.2.15)
tiene un único par `old_price`/`new_price`, ambos `NOT NULL` y sin columna que
distinga qué precio cambió, mientras que `products.sale_price` es nullable: el
esquema no puede representar ni un alta de oferta (`NULL → valor`) ni una
retirada, ni distinguir dos filas cuando ambos precios cambian a la vez. Los
cambios de `sale_price` quedan trazados en `audit_logs` (`AD-20`), cuyos
snapshots incluyen ambos precios. Divergencia registrada frente a §15.3 regla 1.
"""

from sqlalchemy import select

from ..extensions import db
from ..models import PriceHistory


class PriceHistoryRepository:
    @classmethod
    def record(
        cls, *, product_id: int, old_price: int, new_price: int, administrator_id: int
    ) -> PriceHistory:
        """Añade la fila a la sesión abierta, sin cerrarla.

        §15.3 regla 2: el insert va en la misma transacción que el `UPDATE` de
        `products`. Cerrarla es responsabilidad del servicio (10_BACKEND.md §14.1).
        """
        entry = PriceHistory(
            product_id=product_id,
            old_price=old_price,
            new_price=new_price,
            administrator_id=administrator_id,
        )
        db.session.add(entry)
        db.session.flush()
        return entry

    @classmethod
    def list_all(
        cls,
        *,
        offset: int = 0,
        limit: int | None = None,
        product_id: int | None = None,
        administrator_id: int | None = None,
        created_from=None,
        created_to=None,
    ) -> list[PriceHistory]:
        """05_API.md §9.16. Más reciente primero: es un historial, se lee hacia atrás."""
        statement = cls._filtered(product_id, administrator_id, created_from, created_to)
        statement = statement.order_by(PriceHistory.created_at.desc(), PriceHistory.id.desc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())

    @classmethod
    def count_all(
        cls,
        *,
        product_id: int | None = None,
        administrator_id: int | None = None,
        created_from=None,
        created_to=None,
    ) -> int:
        statement = cls._filtered(product_id, administrator_id, created_from, created_to)
        return db.session.execute(
            select(db.func.count()).select_from(statement.subquery())
        ).scalar_one()

    @classmethod
    def _filtered(cls, product_id, administrator_id, created_from, created_to):
        statement = select(PriceHistory)
        if product_id is not None:
            statement = statement.where(PriceHistory.product_id == product_id)
        if administrator_id is not None:
            statement = statement.where(PriceHistory.administrator_id == administrator_id)
        if created_from is not None:
            statement = statement.where(PriceHistory.created_at >= created_from)
        if created_to is not None:
            statement = statement.where(PriceHistory.created_at <= created_to)
        return statement
