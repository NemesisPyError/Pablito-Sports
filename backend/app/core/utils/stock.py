"""Deriva el estado de disponibilidad a partir de una cantidad (`RN-38b`).

Regla exacta (04_BASE_DATOS.md §9.2.1 v1.2.0): la cantidad es la única fuente
de verdad, no se guardan los tres estados como datos independientes.
"""

AVAILABLE = "available"
LOW_STOCK = "low_stock"
OUT_OF_STOCK = "out_of_stock"


def derive_availability(quantity: int) -> str:
    """`> 5` disponible, `1` a `5` stock bajo, `0` (o sin variantes) no disponible."""
    if quantity > 5:
        return AVAILABLE
    if quantity >= 1:
        return LOW_STOCK
    return OUT_OF_STOCK
