"""Validación de entrada de banners (05_API.md §10.13).

La entrada llega como `multipart/form-data`, porque `image` es un archivo: los
campos son cadenas de formulario, no JSON, y hay que convertirlos.

Los schemas validan **forma**, no negocio, y no tocan la base (10_BACKEND.md
§8.2). Un payload mal formado es `422` (§11).
"""

from dataclasses import dataclass
from datetime import datetime

from ..core.exceptions import RequestValidationError
from ..models import BANNER_PLACEMENT_VALUES, DEFAULT_BANNER_PLACEMENT

# 04 §9.2.12.
MAX_TITLE_LENGTH = 255
MAX_SUBTITLE_LENGTH = 255
MAX_LINK_LENGTH = 500
MAX_BUTTON_LABEL_LENGTH = 50

TRUE_VALUES = {"true", "1"}
FALSE_VALUES = {"false", "0"}


@dataclass
class BannerInput:
    title: str
    subtitle: str | None
    link_url: str | None
    button_label: str | None
    placement: str
    position: int
    starts_at: datetime | None
    ends_at: datetime | None
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


def _fecha(form, campo: str, errores: list) -> datetime | None:
    """`RN-74`: la vigencia es opcional; sin ella el banner es permanente."""
    crudo = (form.get(campo) or "").strip()
    if not crudo:
        return None
    try:
        return datetime.fromisoformat(crudo)
    except ValueError:
        errores.append({"field": campo, "detail": f"{campo} must be an ISO 8601 datetime"})
        return None


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


def _zona(form, errores: list) -> str:
    """`placement` (§9.11, v1.1.0). Ausente o vacío es `hero`.

    Un valor fuera del conjunto es `422`, **no** se ignora. Es el contraste
    deliberado con §4.6: en una lectura, un valor desconocido solo amplía el
    listado; en una escritura, dejaría la pieza publicada en una zona que el
    administrador no eligió.
    """
    crudo = (form.get("placement") or "").strip()
    if not crudo:
        return DEFAULT_BANNER_PLACEMENT
    if crudo not in BANNER_PLACEMENT_VALUES:
        errores.append(
            {
                "field": "placement",
                "detail": "placement must be one of " + ", ".join(BANNER_PLACEMENT_VALUES),
            }
        )
        return DEFAULT_BANNER_PLACEMENT
    return crudo


def parse_banner(form) -> BannerInput:
    """`BannerCreateDTO` / `BannerUpdateDTO` (§10.13), sin el archivo.

    La imagen se valida y almacena aparte: es un archivo, no un campo de forma.
    """
    errores: list[dict] = []

    titulo = _texto(form, "title", errores, maximo=MAX_TITLE_LENGTH, obligatorio=True)
    subtitulo = _texto(form, "subtitle", errores, maximo=MAX_SUBTITLE_LENGTH, obligatorio=False)
    enlace = _texto(form, "link_url", errores, maximo=MAX_LINK_LENGTH, obligatorio=False)
    boton = _texto(form, "button_label", errores, maximo=MAX_BUTTON_LABEL_LENGTH, obligatorio=False)
    zona = _zona(form, errores)

    # 04 §9.2.12: `CHECK (position >= 0)`.
    crudo_posicion = form.get("position")
    posicion = 0
    if crudo_posicion is None or str(crudo_posicion).strip() == "":
        errores.append({"field": "position", "detail": "position is required"})
    else:
        try:
            posicion = int(str(crudo_posicion).strip())
        except ValueError:
            errores.append({"field": "position", "detail": "position must be an integer"})
        else:
            if posicion < 0:
                errores.append({"field": "position", "detail": "position must be 0 or greater"})

    inicio = _fecha(form, "starts_at", errores)
    fin = _fecha(form, "ends_at", errores)
    # 04 §9.2.12: `CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)`.
    if inicio is not None and fin is not None and fin <= inicio:
        errores.append({"field": "ends_at", "detail": "ends_at must be later than starts_at"})

    activo = _booleano(form, "is_active", errores, defecto=True)

    if errores:
        raise RequestValidationError(errores)

    return BannerInput(
        title=titulo,
        subtitle=subtitulo,
        link_url=enlace,
        button_label=boton,
        placement=zona,
        position=posicion,
        starts_at=inicio,
        ends_at=fin,
        is_active=activo,
    )
