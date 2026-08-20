"""DTOs administrativos de solo lectura (05_API.md §10.11, §10.12).

Los DTOs son datos planos: no conocen SQLAlchemy ni contienen lógica de negocio
(`AD-12`, 10_BACKEND.md §8.7).
"""

from dataclasses import dataclass

from .common_dtos import BaseDTO, NamedEntityDTO


@dataclass(frozen=True)
class AdministratorMinimalDTO(BaseDTO):
    """§10.11. La identidad mínima de quien ejecutó una operación."""

    id: int
    username: str


@dataclass(frozen=True)
class AdministratorProfileDTO(BaseDTO):
    """§10.10. Perfil del administrador autenticado.

    `password_hash` no figura y no puede figurar: 03_SEGURIDAD.md §5.5 exige que
    el hash nunca salga del servidor.
    """

    id: int
    username: str
    email: str
    role: str
    last_login_at: str | None


@dataclass(frozen=True)
class AdministratorDTO(BaseDTO):
    """§10.10. Extiende `AdministratorProfileDTO` con el estado administrativo."""

    id: int
    username: str
    email: str
    role: str
    last_login_at: str | None
    is_active: bool
    created_at: str
    updated_at: str
    deleted_at: str | None


@dataclass(frozen=True)
class BannerAdminDTO(BaseDTO):
    """§10.3. DTO **exclusivo del panel**.

    `AD-12` prohíbe exponer identificadores internos en la API pública; §4.8 los
    admite en la privada, que los necesita para direccionar las escrituras de
    §9.11. No lleva marcas de tiempo administrativas, en línea con
    `PromotionDTO` y `AdministratorProfileDTO`: el panel opera sobre el estado
    del recurso, no sobre su historia.

    `BannerDTO` (el público, en `catalog_dtos`) suma los mismos `button_label`
    y `placement`: son contenido de la pieza, no metadatos administrativos.
    """

    id: int
    title: str
    subtitle: str | None
    image_url: str | None
    link_url: str | None
    button_label: str | None
    placement: str
    position: int
    starts_at: str | None
    ends_at: str | None
    is_active: bool


@dataclass(frozen=True)
class StoreSettingsAdminDTO(BaseDTO):
    """§10.x. Configuración completa, visible solo en el panel.

    Extiende `StoreSettingsPublicDTO` (en `catalog_dtos`) con las plantillas de
    WhatsApp y el contador de destacados, que `AD-12` mantiene fuera del
    contrato público. `StoreSettingsPublicDTO` **no cambia**.

    No lleva `updated_at`: §10.x lo declara explícitamente fuera del DTO.
    """

    store_name: str
    whatsapp_number: str
    email: str | None
    address: str | None
    business_hours: str | None
    social_links: dict | None
    about_title: str | None
    about_text: str | None
    about_image_url: str | None
    message_template: str
    item_template: str
    featured_products_count: int


@dataclass(frozen=True)
class GenderAdminDTO(BaseDTO):
    """§10.7 `GenderAdminDTO`, salida de §9.17.

    Idéntico a `GenderDTO` más el identificador. `AD-12` lo prohíbe en la API
    pública, pero §4.8 lo admite en la privada, y `ProductCreateDTO` exige
    `gender_id`: sin este DTO el panel no puede componer el alta de un producto.

    Sigue siendo **solo lectura** (`S-06`): que el panel lea el identificador no
    convierte a los sexos en administrables.
    """

    id: int
    slug: str
    name: str


@dataclass(frozen=True)
class SizeTypeAdminDTO(BaseDTO):
    """§10.7 `SizeTypeAdminDTO`, salida de §9.18.

    Mismo criterio que `GenderAdminDTO` (`S-07`). Lo necesitan dos altas:
    `ProductCreateDTO` exige `size_type_id`, y §9.9 lo exige para crear un talle.
    """

    id: int
    slug: str
    name: str


@dataclass(frozen=True)
class WhatsAppTemplateDTO(BaseDTO):
    """§10.x. Las dos plantillas, expuestas como recurso propio (§9.13).

    §9.13: *"la plantilla se almacena en `store_settings.message_template` e
    `item_template`. Se expone como recurso separado por claridad del
    contrato"*. Son las mismas columnas que ya viajan en
    `StoreSettingsAdminDTO`, no un dato distinto.

    El mismo DTO sirve de entrada y de salida: §9.13 declara
    `WhatsAppTemplateDTO` en los dos sentidos.
    """

    message_template: str
    item_template: str


@dataclass(frozen=True)
class PromotionScopeDTO(BaseDTO):
    """§10.9 `scope`. Exactamente uno de producto, categoría o marca (`RN-36`)."""

    type: str
    entity: NamedEntityDTO


@dataclass(frozen=True)
class PromotionDTO(BaseDTO):
    """§10.9. Descuento simple con vigencia (`RN-30` a `RN-38b`, `DN-03`).

    El contrato **no expone** `created_at`, `updated_at` ni `deleted_at`, a
    diferencia de otros DTO administrativos: una promoción eliminada no se
    lista, de modo que no hay estado de borrado que comunicar.
    """

    id: int
    name: str
    description: str | None
    discount_percentage: int
    starts_at: str
    ends_at: str | None
    is_active: bool
    scope: PromotionScopeDTO


@dataclass(frozen=True)
class DashboardTotalsDTO(BaseDTO):
    """§10.8 `totals`. Totales por estado, sobre productos no eliminados."""

    total: int
    active: int
    hidden: int
    available: int
    low_stock: int
    out_of_stock: int
    on_sale: int


@dataclass(frozen=True)
class IncompleteProductDTO(BaseDTO):
    """§10.8 `incomplete_products[]` (`RF-39`)."""

    id: int
    slug: str
    name: str
    missing: list[str]


@dataclass(frozen=True)
class DashboardDTO(BaseDTO):
    """§10.8. **DTO agregado; no representa una entidad persistente.**

    Cumple `RF-38` (totales por estado) y `RF-39` (productos incompletos), que
    es lo que 07_PANEL_ADMIN.md §14.1 pide mostrar: el estado del catálogo y lo
    que requiere atención.
    """

    totals: DashboardTotalsDTO
    incomplete_products: list[IncompleteProductDTO]
    recent_price_changes: list


@dataclass(frozen=True)
class AuditLogDTO(BaseDTO):
    """§10.11. Registro inmutable de una escritura del panel (`AD-20`)."""

    id: int
    administrator: AdministratorMinimalDTO
    action: str
    entity_type: str
    entity_id: int
    old_values: dict | None
    new_values: dict | None
    ip_address: str | None
    created_at: str


@dataclass(frozen=True)
class PriceHistoryDTO(BaseDTO):
    """§10.12. Cambio de precio registrado (`RN-70`)."""

    id: int
    product: NamedEntityDTO
    old_price: int
    new_price: int
    administrator: AdministratorMinimalDTO
    created_at: str
