"""Classification, banner and store DTOs (05_API.md §10.2, §10.3, §10.7)."""

from dataclasses import dataclass, field

from .common_dtos import BaseDTO, NamedEntityDTO


@dataclass(frozen=True)
class BrandDTO(BaseDTO):
    """§10.7. `image_url` nulo es el estado normal, no un error: una marca sin
    logotipo cargado es una marca válida y el catálogo la compone con su nombre.
    """

    slug: str
    name: str
    image_url: str | None = None


@dataclass(frozen=True)
class SportDTO(BaseDTO):
    slug: str
    name: str


@dataclass(frozen=True)
class GenderDTO(BaseDTO):
    slug: str
    name: str


@dataclass(frozen=True)
class SizeTypeDTO(BaseDTO):
    slug: str
    name: str


@dataclass(frozen=True)
class SizeDTO(BaseDTO):
    slug: str
    name: str
    size_type: NamedEntityDTO


@dataclass(frozen=True)
class CategoryTreeDTO(BaseDTO):
    """Two-level tree (AD-24)."""

    slug: str
    name: str
    children: list[NamedEntityDTO] = field(default_factory=list)


@dataclass(frozen=True)
class BrandImageDTO(BaseDTO):
    """§10.7 (v1.1.0). Pieza del collage. Sin `id`, conforme a `AD-12`."""

    image_url: str
    alt_text: str | None
    position: int


@dataclass(frozen=True)
class BrandShowcaseDTO(BaseDTO):
    """§7.2c. La marca **como pieza de portada**, no como filtro del catálogo.

    Por eso lleva collage y frase, que no tienen sentido en el listado de §7.6.
    """

    slug: str
    name: str
    image_url: str | None
    tagline: str | None
    position: int
    images: list[BrandImageDTO] = field(default_factory=list)


@dataclass(frozen=True)
class BannerDTO(BaseDTO):
    """RN-73, RN-74. No id is exposed (AD-12).

    Desde la v1.1.0 la clave estable es el par `placement` + `position`, porque
    la posición se numera por zona de la portada.
    """

    title: str
    subtitle: str | None
    image_url: str | None
    link_url: str | None
    button_label: str | None
    placement: str
    position: int


@dataclass(frozen=True)
class StoreSettingsPublicDTO(BaseDTO):
    """PA-10, RN-58 to RN-61. Templates and counters stay in the admin DTO."""

    store_name: str
    whatsapp_number: str
    address: str | None
    business_hours: str | None
    social_links: dict | None


@dataclass(frozen=True)
class StoreAboutDTO(BaseDTO):
    """§7.2b (v1.1.0). Contenido institucional y correo de contacto.

    Recurso propio y **no** parte de `StoreSettingsPublicDTO`: `AD-12` congela
    ese DTO en cinco campos exactos, y ampliarlo habría cambiado un contrato ya
    publicado. Es el mismo criterio con el que se resolvió la plantilla de
    WhatsApp (§7.1).

    Los cuatro campos son opcionales: una respuesta con todos en `null` es
    válida y significa que el administrador todavía no cargó la sección.
    """

    about_title: str | None
    about_text: str | None
    about_image_url: str | None
    email: str | None
