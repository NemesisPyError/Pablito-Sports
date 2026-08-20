"""Validación de entrada de la configuración de tienda (05_API.md §10.x).

Los schemas validan **forma**, no negocio, y no tocan la base (10_BACKEND.md
§8.2). Un payload mal formado es `422` (05_API.md §11).

`RN-60` obliga a validar la presencia de las variables obligatorias antes de
guardar. Las obligatorias son las que 01_ANALISIS_NEGOCIO.md §12.1 marca como
tales; §12.2 **no declara ninguna obligatoria** para la plantilla de ítem, de
modo que aquí tampoco se exige ninguna: inventarla sería una regla propia.
"""

from dataclasses import dataclass

from ..core.exceptions import RequestValidationError

# 04 §9.2.14: `store_name VARCHAR(255)`, `whatsapp_number VARCHAR(50)`.
MAX_STORE_NAME_LENGTH = 255
MAX_WHATSAPP_LENGTH = 50
# 04 §9.2.14 (v1.1.0).
MAX_EMAIL_LENGTH = 255
MAX_ABOUT_TITLE_LENGTH = 255

# 01 §12.1: las dos variables marcadas como obligatorias en el mensaje.
REQUIRED_MESSAGE_VARIABLES = ("items", "total")


@dataclass
class WhatsAppTemplateInput:
    message_template: str
    item_template: str


@dataclass
class StoreSettingsInput:
    store_name: str
    whatsapp_number: str
    email: str | None
    address: str | None
    business_hours: str | None
    social_links: dict | None
    about_title: str | None
    about_text: str | None
    message_template: str
    item_template: str
    featured_products_count: int


def _texto(payload: dict, campo: str, errores: list, *, maximo: int | None, obligatorio: bool):
    crudo = payload.get(campo)
    if crudo is not None and not isinstance(crudo, str):
        errores.append({"field": campo, "detail": f"{campo} must be a string"})
        return None

    valor = (crudo or "").strip()
    if not valor:
        if obligatorio:
            errores.append({"field": campo, "detail": f"{campo} is required"})
        return None
    if maximo is not None and len(valor) > maximo:
        errores.append({"field": campo, "detail": f"{campo} must be at most {maximo} characters"})
    return valor


def _plantilla(payload: dict, campo: str, errores: list, *, requeridas: tuple) -> str | None:
    """Plantilla obligatoria con sus variables obligatorias (`RN-60`).

    No se recorta: los saltos y espacios forman parte del formato del mensaje.
    """
    crudo = payload.get(campo)
    if crudo is not None and not isinstance(crudo, str):
        errores.append({"field": campo, "detail": f"{campo} must be a string"})
        return None

    valor = crudo or ""
    if not valor.strip():
        errores.append({"field": campo, "detail": f"{campo} is required"})
        return None

    faltantes = [nombre for nombre in requeridas if f"{{{{{nombre}}}}}" not in valor]
    if faltantes:
        errores.append(
            {
                "field": campo,
                "detail": f"{campo} must contain the required variables: "
                + ", ".join(f"{{{{{nombre}}}}}" for nombre in faltantes),
            }
        )
    return valor


def _redes(payload: dict, errores: list) -> dict | None:
    """`social_links` es un objeto libre (§10.x): se valida su forma, no su contenido.

    04 §9.2.14 lo declara `JSONB` sin esquema interno, así que las claves las
    fija el panel y no este módulo.
    """
    crudo = payload.get("social_links")
    if crudo is None or crudo == "":
        return None
    if not isinstance(crudo, dict):
        errores.append({"field": "social_links", "detail": "social_links must be an object"})
        return None

    # Un objeto sin claves útiles se guarda como ausencia, no como `{}`: así el
    # DTO público no expone un objeto vacío que el catálogo tendría que filtrar.
    # Una red en blanco es una red que no se cargó, no un valor inválido.
    limpio: dict[str, str] = {}
    for clave, valor in crudo.items():
        if valor is None:
            continue
        if not isinstance(valor, str):
            errores.append(
                {"field": "social_links", "detail": "social_links values must be strings"}
            )
            return None
        if valor.strip():
            limpio[clave] = valor.strip()

    return limpio or None


def _destacados(payload: dict, errores: list) -> int:
    """04 §9.2.14: `CHECK (featured_products_count > 0)`."""
    crudo = payload.get("featured_products_count")
    if crudo is None or crudo == "":
        errores.append(
            {"field": "featured_products_count", "detail": "featured_products_count is required"}
        )
        return 0

    # `bool` es subclase de `int`: `True` no es una cantidad.
    if isinstance(crudo, bool) or not isinstance(crudo, int):
        try:
            valor = int(str(crudo).strip())
        except (TypeError, ValueError):
            errores.append(
                {
                    "field": "featured_products_count",
                    "detail": "featured_products_count must be an integer",
                }
            )
            return 0
    else:
        valor = crudo

    if valor <= 0:
        errores.append(
            {
                "field": "featured_products_count",
                "detail": "featured_products_count must be greater than 0",
            }
        )
    return valor


def parse_whatsapp_template(payload: dict) -> WhatsAppTemplateInput:
    """`WhatsAppTemplateDTO` como entrada (§9.13).

    §9.13 fija la validación en *"variables requeridas (`RF-41`)"*, que es la
    misma de `RN-60` que ya aplica `parse_store_settings`: se reutiliza
    `_plantilla` para que las dos puertas al mismo dato no puedan divergir.
    """
    errores: list[dict] = []

    mensaje = _plantilla(
        payload, "message_template", errores, requeridas=REQUIRED_MESSAGE_VARIABLES
    )
    item = _plantilla(payload, "item_template", errores, requeridas=())

    if errores:
        raise RequestValidationError(errores)

    return WhatsAppTemplateInput(message_template=mensaje, item_template=item)


def parse_store_settings(payload: dict) -> StoreSettingsInput:
    """`StoreSettingsAdminUpdateDTO` (§10.x).

    `PUT` reemplaza el recurso completo: los opcionales ausentes se guardan como
    `NULL`, no se conserva el valor anterior.
    """
    errores: list[dict] = []

    nombre = _texto(payload, "store_name", errores, maximo=MAX_STORE_NAME_LENGTH, obligatorio=True)
    whatsapp = _texto(
        payload, "whatsapp_number", errores, maximo=MAX_WHATSAPP_LENGTH, obligatorio=True
    )
    correo = _texto(payload, "email", errores, maximo=MAX_EMAIL_LENGTH, obligatorio=False)
    direccion = _texto(payload, "address", errores, maximo=None, obligatorio=False)
    horarios = _texto(payload, "business_hours", errores, maximo=None, obligatorio=False)
    redes = _redes(payload, errores)

    # Contenido institucional (v1.1.0). Opcional: su ausencia oculta la sección
    # de la portada, no rompe ninguna pantalla.
    titulo_historia = _texto(
        payload, "about_title", errores, maximo=MAX_ABOUT_TITLE_LENGTH, obligatorio=False
    )
    texto_historia = _texto(payload, "about_text", errores, maximo=None, obligatorio=False)

    mensaje = _plantilla(
        payload, "message_template", errores, requeridas=REQUIRED_MESSAGE_VARIABLES
    )
    item = _plantilla(payload, "item_template", errores, requeridas=())

    destacados = _destacados(payload, errores)

    if errores:
        raise RequestValidationError(errores)

    return StoreSettingsInput(
        store_name=nombre,
        whatsapp_number=whatsapp,
        email=correo,
        address=direccion,
        business_hours=horarios,
        social_links=redes,
        about_title=titulo_historia,
        about_text=texto_historia,
        message_template=mensaje,
        item_template=item,
        featured_products_count=destacados,
    )
