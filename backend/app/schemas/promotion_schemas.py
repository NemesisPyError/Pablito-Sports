"""Validación de entrada de promociones (05_API.md §10.9).

Los schemas validan **forma**, no negocio, y no tocan la base (10_BACKEND.md
§8.2). Que la entidad de destino exista es negocio y lo comprueba el servicio.

Un payload mal formado es `422` (05_API.md §11).
"""

from dataclasses import dataclass
from datetime import datetime

from ..core.exceptions import RequestValidationError
from .shared import texto, texto_o_none

# 04 §9.2.11: `CHECK (discount_percentage BETWEEN 1 AND 99)`.
MIN_DISCOUNT = 1
MAX_DISCOUNT = 99

MAX_NAME_LENGTH = 255

# `RN-36`: como máximo uno. El orden fija cuál se reporta primero en el error.
SCOPE_FIELDS = ("product_id", "category_id", "brand_id")


@dataclass
class PromotionInput:
    name: str
    description: str | None
    discount_percentage: int
    starts_at: datetime
    ends_at: datetime | None
    is_active: bool
    product_id: int | None
    category_id: int | None
    brand_id: int | None

    @property
    def scope_field(self) -> str | None:
        """El campo de alcance poblado, o `None` si aplica a todos los productos."""
        return next((campo for campo in SCOPE_FIELDS if getattr(self, campo) is not None), None)

    @property
    def scope_id(self) -> int | None:
        campo = self.scope_field
        return getattr(self, campo) if campo is not None else None


def _fecha(payload: dict, campo: str, errores: list, *, obligatoria: bool) -> datetime | None:
    crudo = payload.get(campo)
    if crudo in (None, ""):
        if obligatoria:
            errores.append({"field": campo, "detail": f"{campo} is required"})
        return None
    if not isinstance(crudo, str):
        errores.append({"field": campo, "detail": f"{campo} must be an ISO 8601 datetime"})
        return None
    try:
        return datetime.fromisoformat(crudo)
    except ValueError:
        errores.append({"field": campo, "detail": f"{campo} must be an ISO 8601 datetime"})
        return None


def _entero_de_alcance(payload: dict, campo: str, errores: list) -> int | None:
    crudo = payload.get(campo)
    if crudo in (None, ""):
        return None
    if isinstance(crudo, bool) or not isinstance(crudo, int):
        errores.append({"field": campo, "detail": f"{campo} must be an integer"})
        return None
    return crudo


def parse_promotion(payload: dict) -> PromotionInput:
    """`PromotionCreateDTO` / `PromotionUpdateDTO` (§10.9).

    Ambos comparten forma: §10.9 los define en una sola tabla y `PUT` reemplaza
    el recurso completo.
    """
    errores: list[dict] = []

    nombre = texto(payload, "name", errores, maximo=MAX_NAME_LENGTH)

    descuento = payload.get("discount_percentage")
    if descuento is None:
        errores.append(
            {"field": "discount_percentage", "detail": "discount_percentage is required"}
        )
    elif isinstance(descuento, bool) or not isinstance(descuento, int):
        errores.append(
            {"field": "discount_percentage", "detail": "discount_percentage must be an integer"}
        )
    elif not MIN_DISCOUNT <= descuento <= MAX_DISCOUNT:
        errores.append(
            {
                "field": "discount_percentage",
                "detail": f"discount_percentage must be between {MIN_DISCOUNT} and {MAX_DISCOUNT}",
            }
        )

    inicio = _fecha(payload, "starts_at", errores, obligatoria=True)
    fin = _fecha(payload, "ends_at", errores, obligatoria=False)
    # 04 §9.2.11: `CHECK (ends_at IS NULL OR ends_at > starts_at)`. `RN-33`: sin
    # fecha de fin la promoción rige indefinidamente.
    if inicio is not None and fin is not None and fin <= inicio:
        errores.append({"field": "ends_at", "detail": "ends_at must be later than starts_at"})

    activa = payload.get("is_active", True)
    if not isinstance(activa, bool):
        errores.append({"field": "is_active", "detail": "is_active must be a boolean"})

    alcances = {campo: _entero_de_alcance(payload, campo, errores) for campo in SCOPE_FIELDS}
    poblados = [campo for campo, valor in alcances.items() if valor is not None]
    if len(poblados) > 1:
        # `RN-36`: como máximo uno. Ninguno poblado es válido: la promoción
        # aplica a todos los productos (v1.6.0, pedido explícito del usuario).
        errores.append(
            {
                "field": SCOPE_FIELDS[0],
                "detail": "at most one of " + ", ".join(SCOPE_FIELDS) + " may be set",
            }
        )

    if errores:
        raise RequestValidationError(errores)

    return PromotionInput(
        name=nombre,
        description=texto_o_none(payload, "description", errores),
        discount_percentage=descuento,
        starts_at=inicio,
        ends_at=fin,
        is_active=activa,
        **alcances,
    )
