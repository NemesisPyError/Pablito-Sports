"""Lectura y validación reutilizable de la entrada (10_BACKEND.md §8.2).

Schemas validate shape only: no business logic and no database access. A malformed
known parameter is a 422 (05_API.md §11); an unknown parameter is ignored (AD-26).

**Tipos de la entrada (S-13).** Antes, un cuerpo JSON con el tipo equivocado
llegaba hasta un `.strip()` y reventaba en `AttributeError` -> 500. Medido con
un barrido de 304 peticiones malformadas sobre todos los endpoints de escritura:
**90 devolvían 500**, en 23 combinaciones distintas de endpoint y campo. Dos
causas, y las dos se cierran acá:

  1. el **cuerpo entero** no era un objeto (`[]`, `"texto"`, `5`): entonces
     `request.get_json(...) or {}` devolvía eso y el `.get()` siguiente fallaba.
     Lo resuelve `json_body()`.
  2. un **campo** traía otro tipo (`{"username": 123}`): lo resuelve `texto()`.

Criterio: **no se convierte**. `123` no se acepta como `"123"`; se responde 422
diciendo que el campo debe ser una cadena. Convertir en silencio es justo lo que
hace que un dato con la forma equivocada entre al dominio sin que nadie se entere.
"""

from flask import request

from ..core.exceptions import BadRequestError, RequestValidationError
from ..core.utils.pagination import DEFAULT_PAGE, DEFAULT_PER_PAGE, PageRequest, clamp_per_page


def json_body() -> dict:
    """El cuerpo JSON de la petición como diccionario.

    Un cuerpo ausente o ilegible es `{}`: los schemas ya responden 422 por los
    campos que falten, que es el error útil. Un cuerpo **legible pero que no es
    un objeto** —una lista, un número, una cadena— sí es un 400: la petición
    está mal formada, no es que le falte un campo.
    """
    cuerpo = request.get_json(silent=True)
    if cuerpo is None:
        return {}
    if not isinstance(cuerpo, dict):
        raise BadRequestError("request body must be a JSON object")
    return cuerpo


def texto(
    payload: dict,
    campo: str,
    errores: list,
    *,
    maximo: int | None = None,
    requerido: bool = True,
) -> str:
    """Lee un campo de texto **sin convertir el tipo**.

    Devuelve siempre una cadena para que quien llama pueda seguir componiendo
    validaciones sin comprobar `None`; si hubo error ya quedó en `errores` y el
    schema abortará con 422 antes de usar el valor.
    """
    valor = payload.get(campo)

    if valor is None:
        if requerido:
            errores.append({"field": campo, "detail": f"{campo} is required"})
        return ""

    if not isinstance(valor, str):
        # Un booleano, un número o una estructura: se rechaza, no se convierte.
        errores.append({"field": campo, "detail": f"{campo} must be a string"})
        return ""

    valor = valor.strip()
    if not valor:
        if requerido:
            errores.append({"field": campo, "detail": f"{campo} is required"})
        return ""

    if maximo is not None and len(valor) > maximo:
        errores.append({"field": campo, "detail": f"{campo} must be at most {maximo} characters"})

    return valor


def texto_o_none(payload: dict, campo: str, errores: list, *, maximo: int | None = None):
    """Variante opcional: ausente o vacío es `None`, con el mismo rigor de tipo."""
    valor = texto(payload, campo, errores, maximo=maximo, requerido=False)
    return valor or None


TRUE_VALUES = {"true", "1"}
FALSE_VALUES = {"false", "0"}


def parse_int(args, name: str, *, minimum: int | None = None, default: int | None = None):
    raw = args.get(name)
    if raw is None or raw == "":
        return default
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise RequestValidationError(
            [{"field": name, "detail": f"{name} must be an integer"}]
        ) from None
    if minimum is not None and value < minimum:
        raise RequestValidationError(
            [{"field": name, "detail": f"{name} must be greater than or equal to {minimum}"}]
        )
    return value


def parse_bool(args, name: str) -> bool | None:
    raw = args.get(name)
    if raw is None or raw == "":
        return None
    normalised = raw.strip().lower()
    if normalised in TRUE_VALUES:
        return True
    if normalised in FALSE_VALUES:
        return False
    raise RequestValidationError([{"field": name, "detail": f"{name} must be a boolean"}])


def parse_slug_list(args, name: str) -> list[str]:
    """§4.5: several values of the same criterion arrive comma separated."""
    raw = args.get(name)
    if not raw:
        return []
    return [slug.strip() for slug in raw.split(",") if slug.strip()]


def parse_page_request(args) -> PageRequest:
    """§4.4: page >= 1; per_page above the maximum is capped silently."""
    page = parse_int(args, "page", minimum=1, default=DEFAULT_PAGE)
    per_page = parse_int(args, "per_page", minimum=1, default=DEFAULT_PER_PAGE)
    return PageRequest(page=page, per_page=clamp_per_page(per_page))
