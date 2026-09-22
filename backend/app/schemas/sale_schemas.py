"""Entrada de la venta manual del panel (05_API.md §9.19).

Validación de **forma**, no de negocio: acá se comprueba que el JSON tenga la
estructura y los tipos declarados. Que haya stock, que el producto exista y que
la variante le pertenezca lo decide el servicio, que es quien puede mirar la
base y quien sostiene la transacción.

Criterio de tipos, el mismo que fijó S-13 en `shared.py`: **no se convierte**.
`"2"` no se acepta como `2`, y `2.0` tampoco: una cantidad es un entero o es un
error. Convertir en silencio deja entrar al dominio un dato con la forma
equivocada sin que nadie se entere — y en una venta ese dato descuenta stock.

`bool` se rechaza explícitamente en los enteros porque en Python `True` **es**
un entero (`isinstance(True, int)` es cierto) y `{"quantity": true}` se
colaría como cantidad 1.
"""

from dataclasses import dataclass

from .shared import json_body  # noqa: F401  (reexportado por comodidad del endpoint)

# Cota defensiva del tamaño de una venta. No es una regla de negocio: es el
# límite que evita que un cuerpo con miles de líneas mantenga abierta una
# transacción con otros tantos bloqueos de fila.
MAX_SALE_ITEMS = 50

# `sales.quantity`, `sales.unit_price` y `sale_orders.total_amount` son
# `INTEGER` de PostgreSQL: hasta 2.147.483.647. Sin estas cotas, una cantidad
# absurda no daba un error de validacion sino un desborde al insertar la
# cabecera — es decir, un 500. Lo encontro la verificacion E2E pidiendo 99.999
# unidades de un producto de 585.000: el total no entraba en la columna.
#
# 10.000 unidades en una linea de una venta cargada a mano no es un caso real;
# el tope existe para que lo imposible falle como 422 y no como error de base.
MAX_LINE_QUANTITY = 10_000
MAX_INTEGER = 2_147_483_647


@dataclass
class SaleLineInput:
    product_id: int
    variant_id: int
    quantity: int
    # `None` significa "usá el precio vigente", no "gratis". El servicio lo
    # resuelve; el schema solo distingue ausente de presente-con-valor.
    unit_price: int | None


def _entero(
    valor, campo: str, indice: int, errores: list, *, minimo: int, maximo: int
) -> int | None:
    """Un entero de verdad, con su posición en el error para poder señalarlo."""
    ubicacion = f"items[{indice}].{campo}"
    if valor is None:
        errores.append({"field": ubicacion, "detail": f"{campo} is required"})
        return None
    if isinstance(valor, bool) or not isinstance(valor, int):
        errores.append({"field": ubicacion, "detail": f"{campo} must be an integer"})
        return None
    if valor < minimo:
        errores.append({"field": ubicacion, "detail": f"{campo} must be >= {minimo}"})
        return None
    if valor > maximo:
        errores.append({"field": ubicacion, "detail": f"{campo} must be <= {maximo}"})
        return None
    return valor


def parse_manual_sale(payload: dict) -> list[SaleLineInput]:
    """`POST /admin/sales` → las líneas de la venta, ya tipadas.

    Rechaza dos variantes repetidas en la misma venta. Podrían sumarse, pero
    entonces el total que confirmó el administrador y el que se registra podrían
    no coincidir por un error de armado que nadie llegó a ver. Es preferible
    devolver 422 y que el panel —que ya fusiona las líneas al agregarlas— lo
    corrija.
    """
    from ..core.exceptions import RequestValidationError

    errores: list = []
    crudas = payload.get("items")

    if crudas is None:
        raise RequestValidationError([{"field": "items", "detail": "items is required"}])
    if not isinstance(crudas, list):
        raise RequestValidationError([{"field": "items", "detail": "items must be an array"}])
    if not crudas:
        raise RequestValidationError(
            [{"field": "items", "detail": "items must contain at least one line"}]
        )
    if len(crudas) > MAX_SALE_ITEMS:
        raise RequestValidationError(
            [{"field": "items", "detail": f"items must contain at most {MAX_SALE_ITEMS} lines"}]
        )

    lineas: list[SaleLineInput] = []
    vistas: set[tuple[int, int]] = set()

    for indice, cruda in enumerate(crudas):
        if not isinstance(cruda, dict):
            errores.append({"field": f"items[{indice}]", "detail": "line must be a JSON object"})
            continue

        product_id = _entero(
            cruda.get("product_id"), "product_id", indice, errores, minimo=1, maximo=MAX_INTEGER
        )
        variant_id = _entero(
            cruda.get("variant_id"), "variant_id", indice, errores, minimo=1, maximo=MAX_INTEGER
        )
        # Mínimo 1: vender cero unidades no es una venta, y el CHECK de
        # `sales.quantity > 0` lo rechazaría igual pero como error de base.
        quantity = _entero(
            cruda.get("quantity"),
            "quantity",
            indice,
            errores,
            minimo=1,
            maximo=MAX_LINE_QUANTITY,
        )

        unit_price = None
        if "unit_price" in cruda and cruda["unit_price"] is not None:
            unit_price = _entero(
                cruda.get("unit_price"),
                "unit_price",
                indice,
                errores,
                minimo=0,
                maximo=MAX_INTEGER,
            )
            if unit_price is None:
                continue

        if product_id is None or variant_id is None or quantity is None:
            continue

        clave = (product_id, variant_id)
        if clave in vistas:
            errores.append(
                {
                    "field": f"items[{indice}].variant_id",
                    "detail": "the same variant cannot appear twice in one sale",
                }
            )
            continue
        vistas.add(clave)

        lineas.append(
            SaleLineInput(
                product_id=product_id,
                variant_id=variant_id,
                quantity=quantity,
                unit_price=unit_price,
            )
        )

    if errores:
        raise RequestValidationError(errores)

    return lineas
