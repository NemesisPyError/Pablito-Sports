"""Validación de entrada de bancos de Superdescuentos.

Mismo criterio que `banner_schemas.py`: la entrada llega como
`multipart/form-data` porque `image` es un archivo. Los schemas validan
**forma**, no negocio, y no tocan la base (10_BACKEND.md §8.2).
"""

from dataclasses import dataclass

from ..core.exceptions import RequestValidationError

MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 500
MIN_DISCOUNT = 1
MAX_DISCOUNT = 99

TRUE_VALUES = {"true", "1"}
FALSE_VALUES = {"false", "0"}


@dataclass
class BankInput:
    name: str
    description: str | None
    discount_percentage: int
    position: int
    is_active: bool


def _texto(form, campo: str, errores: list, *, maximo: int, obligatorio: bool) -> str | None:
    valor = (form.get(campo) or "").strip()
    if not valor:
        if obligatorio:
            errores.append({"field": campo, "detail": f"{campo} is required"})
        return None
    if len(valor) > maximo:
        errores.append({"field": campo, "detail": f"{campo} must be at most {maximo} characters"})
    return valor


def _booleano(form, campo: str, errores: list, *, defecto: bool) -> bool:
    crudo = form.get(campo)
    if crudo is None or crudo == "":
        return defecto
    normalizado = str(crudo).strip().lower()
    if normalizado in TRUE_VALUES:
        return True
    if normalizado in FALSE_VALUES:
        return False
    errores.append({"field": campo, "detail": f"{campo} must be a boolean"})
    return defecto


def _porcentaje(form, errores: list) -> int:
    campo = "discount_percentage"
    crudo = form.get(campo)
    if crudo is None or str(crudo).strip() == "":
        errores.append({"field": campo, "detail": f"{campo} is required"})
        return 0
    try:
        valor = int(str(crudo).strip())
    except ValueError:
        errores.append({"field": campo, "detail": f"{campo} must be an integer"})
        return 0
    if valor < MIN_DISCOUNT or valor > MAX_DISCOUNT:
        errores.append(
            {
                "field": "discount_percentage",
                "detail": f"discount_percentage must be between {MIN_DISCOUNT} and {MAX_DISCOUNT}",
            }
        )
    return valor


def _posicion(form, errores: list) -> int:
    crudo = form.get("position")
    if crudo is None or str(crudo).strip() == "":
        return 0
    try:
        valor = int(str(crudo).strip())
    except ValueError:
        errores.append({"field": "position", "detail": "position must be an integer"})
        return 0
    if valor < 0:
        errores.append({"field": "position", "detail": "position must be 0 or greater"})
    return valor


def parse_bank(form) -> BankInput:
    """`BankCreateDTO` / `BankUpdateDTO`, sin el archivo.

    La imagen se valida y almacena aparte: es un archivo, no un campo de forma.
    """
    errores: list[dict] = []

    nombre = _texto(form, "name", errores, maximo=MAX_NAME_LENGTH, obligatorio=True)
    # Nota interna del panel, opcional: no la muestra la tarjeta pública.
    descripcion = _texto(
        form, "description", errores, maximo=MAX_DESCRIPTION_LENGTH, obligatorio=False
    )
    porcentaje = _porcentaje(form, errores)
    posicion = _posicion(form, errores)
    activo = _booleano(form, "is_active", errores, defecto=True)

    if errores:
        raise RequestValidationError(errores)

    return BankInput(
        name=nombre,
        description=descripcion,
        discount_percentage=porcentaje,
        position=posicion,
        is_active=activo,
    )
