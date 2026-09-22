"""Deriva el estado de disponibilidad a partir de una cantidad (`RN-38b`).

Regla exacta (04_BASE_DATOS.md §9.2.1 v1.2.0): la cantidad es la única fuente
de verdad, no se guardan los tres estados como datos independientes.
"""

AVAILABLE = "available"
LOW_STOCK = "low_stock"
OUT_OF_STOCK = "out_of_stock"

# Frontera entre «stock bajo» y «disponible». Deja de estar escrita a mano en
# `derive_availability` porque ahora también decide hasta dónde se publica la
# cantidad exacta (ver `public_available_quantity`).
LOW_STOCK_THRESHOLD = 5


def derive_availability(quantity: int) -> str:
    """`> 5` disponible, `1` a `5` stock bajo, `0` (o sin variantes) no disponible."""
    if quantity > LOW_STOCK_THRESHOLD:
        return AVAILABLE
    if quantity >= 1:
        return LOW_STOCK
    return OUT_OF_STOCK


def max_orderable_units(quantity: int) -> int:
    """Tope de unidades que el carrito de consulta acepta para una variante.

    Concilia dos reglas que se cruzan:

    - `RN-40`: un producto agotado **sí** puede agregarse, porque el carrito es
      de consulta y termina en WhatsApp — «hoy no hay, la semana que viene sí».
      Por eso el piso es una unidad aunque el stock sea `0`.
    - `RN-54b`: por encima de ese piso manda el stock real. Si hay 3, no se
      pueden pedir 4.

    El resultado no es «stock disponible»: para eso está `variants.quantity`,
    que es lo que se informa al cliente. Esto es cuánto deja pedir el carrito.
    """
    return max(quantity, 1)


def public_available_quantity(quantity: int) -> int | None:
    """Cuánto stock se puede contar en una respuesta pública.

    El número exacto solo sale cuando es bajo —de `0` a `LOW_STOCK_THRESHOLD`—,
    que es justo cuando le sirve a quien compra: poder ver «quedan 3» y que el
    carrito no lo deje pedir 4. Por encima del umbral devuelve `None`: publicar
    el volumen real del inventario en una API abierta expone al negocio sin
    darle nada al cliente, que igual no va a chocar con ese techo.

    `None` **no** significa «sin límite». El tope real lo sigue aplicando el
    servidor al revalidar el carrito, contra `variants.quantity`; esto solo
    decide cuánto se cuenta de antemano.
    """
    return quantity if quantity <= LOW_STOCK_THRESHOLD else None
