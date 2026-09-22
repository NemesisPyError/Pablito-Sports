"""Admin product, variant and image rules (05_API.md §9.2).

Toda escritura corre bajo `@transactional` (10_BACKEND.md §14.1) y deja registro
en `audit_logs` dentro de la misma transacción (`AD-20`, `CONS-05`). El
identificador del administrador llega desde la ruta: §8.4 prohíbe que el
servicio conozca HTTP.
"""

from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from ..core.audit import (
    ACTION_ACTIVATE,
    ACTION_CREATE,
    ACTION_DEACTIVATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AuditService,
)
from ..core.decorators import schedule_file_deletion, transactional
from ..core.exceptions import (
    BadRequestError,
    BusinessRuleError,
    NotFoundError,
    RequestValidationError,
)
from ..core.utils.pagination import Page
from ..core.utils.slugs import slugify
from ..core.utils.stock import derive_availability
from ..core.utils.urls import public_file_url
from ..extensions import db
from ..models import Image, Product, Variant
from ..repositories.admin_product_repository import AdminProductRepository
from ..repositories.category_repository import CategoryRepository
from ..repositories.gender_repository import GenderRepository
from ..repositories.price_history_repository import PriceHistoryRepository
from ..repositories.product_repository import ProductRepository
from ..repositories.sale_repository import SaleRepository
from ..repositories.size_repository import SizeRepository
from ..repositories.sport_repository import SportRepository
from ..schemas.sale_schemas import MAX_INTEGER

# 04 §9.2.1: `products.slug` es `VARCHAR(255)`. La reserva deja lugar al
# sufijo de unicidad (`-2`, `-3`...) sin superar la columna.
SLUG_MAX_LENGTH = 255
# Cota defensiva: en la práctica una sola colisión real (dos altas
# concurrentes con el mismo nombre) alcanza para necesitar un reintento.
SLUG_MAX_ATTEMPTS = 20

# §14.2: snapshot selectivo, no la entidad entera. Las colecciones (categorías,
# deportes, talles, variantes, imágenes) tienen su propio rastro.
PRODUCT_AUDIT_FIELDS = (
    "name",
    "slug",
    "sku",
    "list_price",
    "sale_price",
    "availability",
    "is_active",
    "is_featured",
    "is_new",
    "home_new_position",
    "primary_category_id",
    "brand_id",
    "size_type_id",
    "deleted_at",
)

IMAGE_AUDIT_FIELDS = ("product_id", "file_path", "alt_text", "position", "is_primary", "deleted_at")

VARIANT_AUDIT_FIELDS = ("product_id", "size_id", "quantity", "deleted_at")


class AdminProductService:
    @classmethod
    def list_paginated(cls, query):
        """§9.3. Recibe la consulta ya validada por `schemas/` (10_BACKEND.md §8.2)."""
        criteria = {
            "search": query.search,
            "brand_slugs": query.brand_slugs,
            "category_slugs": query.category_slugs,
            "availability": query.availability,
            "is_active": query.is_active,
        }
        total = AdminProductRepository.count_all(**criteria)
        items = AdminProductRepository.list_all(
            offset=query.page.offset,
            limit=query.page.limit,
            sort=query.sort,
            **criteria,
        )
        return Page(
            items=[cls._to_admin_list_dto(item) for item in items],
            page=query.page.page,
            per_page=query.page.per_page,
            total=total,
        )

    @classmethod
    def get_by_id(cls, product_id: int):
        product = AdminProductRepository.find_by_id(product_id)
        if product is None:
            raise NotFoundError("product not found", resource="product")
        return cls._to_admin_detail_dto(product)

    @classmethod
    @transactional
    def create(cls, payload: dict, *, administrator_id: int):
        fields = cls._product_fields(payload)
        product = cls._insert_with_unique_slug(fields)
        cls._sync_relations(product, payload)
        cls._sync_variants(product)
        db.session.flush()
        cls._recompute_availability(product)
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type="product",
            entity_id=product.id,
            new_values=AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS),
        )
        return cls._to_admin_detail_dto(product)

    @classmethod
    @transactional
    def update(cls, product_id: int, payload: dict, *, administrator_id: int):
        product = AdminProductRepository.find_by_id(product_id)
        if product is None:
            raise NotFoundError("product not found", resource="product")
        fields = cls._product_fields(payload)
        old_values = AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS)
        previous_list_price = product.list_price
        for key, value in fields.items():
            setattr(product, key, value)
        cls._sync_relations(product, payload)
        cls._sync_variants(product)
        db.session.flush()
        cls._recompute_availability(product)
        db.session.flush()
        cls._record_price_change(product, previous_list_price, administrator_id)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="product",
            entity_id=product.id,
            old_values=old_values,
            new_values=AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS),
        )
        return cls._to_admin_detail_dto(product)

    @classmethod
    @transactional
    def delete(cls, product_id: int, *, administrator_id: int):
        product = AdminProductRepository.find_by_id(product_id)
        if product is None:
            raise NotFoundError("product not found", resource="product")
        old_values = AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS)
        product.is_active = False
        product.deleted_at = datetime.now(UTC)
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type="product",
            entity_id=product.id,
            old_values=old_values,
            new_values=AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS),
        )
        return cls._to_admin_list_dto(product)

    @classmethod
    @transactional
    def set_active(cls, product_id: int, is_active: bool, *, administrator_id: int):
        product = AdminProductRepository.find_by_id(product_id)
        if product is None:
            raise NotFoundError("product not found", resource="product")
        old_values = AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS)
        product.is_active = is_active
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_ACTIVATE if is_active else ACTION_DEACTIVATE,
            entity_type="product",
            entity_id=product.id,
            old_values=old_values,
            new_values=AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS),
        )
        return cls._to_admin_list_dto(product)

    @classmethod
    @transactional
    def set_home_new(cls, product_id: int, selected: bool, *, administrator_id: int):
        """Alta/baja en Novedades (§9.8 panel), no un campo del formulario.

        `home_new_position` es a la vez la marca de selección y el orden
        (mismo patrón que `Brand.home_position`): agregar manda siempre al
        final de la fila, quitar lo deja en `NULL`. No hay reordenamiento
        manual porque no está entre los requisitos actuales — el orden es el
        de selección.
        """
        product = AdminProductRepository.find_by_id(product_id)
        if product is None:
            raise NotFoundError("product not found", resource="product")
        old_values = AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS)
        if selected:
            if product.home_new_position is None:
                product.home_new_position = AdminProductRepository.next_home_new_position()
        else:
            product.home_new_position = None
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="product",
            entity_id=product.id,
            old_values=old_values,
            new_values=AuditService.snapshot(product, PRODUCT_AUDIT_FIELDS),
        )
        return cls._to_admin_list_dto(product)

    @classmethod
    @transactional
    def set_variant_quantity(
        cls, product_id: int, variant_id: int, quantity: int, *, administrator_id: int
    ):
        """RN-38b (v1.4.0): la cantidad es la fuente de verdad del stock.

        Recalcula `products.availability` como la suma de `quantity` de las
        variantes vivas del producto — no es un campo que el administrador
        escriba en la ficha (§14.3), sale derivado de acá.
        """
        variant = AdminProductRepository.find_variant_by_id(product_id, variant_id)
        if variant is None:
            raise NotFoundError("variant not found", resource="variant")

        old_values = AuditService.snapshot(variant, VARIANT_AUDIT_FIELDS)
        variant.quantity = quantity
        db.session.flush()
        cls._recompute_availability(variant.product)
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="variant",
            entity_id=variant.id,
            old_values=old_values,
            new_values=AuditService.snapshot(variant, VARIANT_AUDIT_FIELDS),
        )
        return cls._variant_dto(variant)

    @classmethod
    @transactional
    def register_sale(
        cls, product_id: int, variant_id: int, quantity: int, *, administrator_id: int
    ):
        """RN-82: registra una venta y descuenta `variants.quantity` sola.

        No se puede vender más de lo que hay cargado — a diferencia de
        `set_variant_quantity`, que reemplaza el número a mano y puede
        ponerlo en cualquier valor válido, esto es una operación de dominio
        con una precondición real. El registro (`sales`) es inmutable, mismo
        patrón que `price_history` (RN-70): no se edita ni se borra.

        **Concurrencia.** La fila se lee con `FOR UPDATE`, dentro de la
        transacción que abre `@transactional`. Leer, comprobar y descontar es
        una secuencia de tres pasos sobre el mismo número: sin el bloqueo, dos
        ventas simultáneas del mismo talle leían ambas el stock viejo, ambas
        pasaban la comprobación y la segunda escritura pisaba a la primera —se
        vendían más unidades de las que había y el descuento perdido no dejaba
        rastro—. Con el bloqueo, la segunda venta espera al `commit` de la
        primera y vuelve a leer el stock ya descontado, así que su comprobación
        se hace contra el número real.
        """
        variant = cls._sell_locked_variant(
            product_id, variant_id, quantity, administrator_id=administrator_id
        )
        return cls._variant_dto(variant)

    @classmethod
    def _sell_locked_variant(
        cls,
        product_id: int,
        variant_id: int,
        quantity: int,
        *,
        administrator_id: int,
        sale_order_id: int | None = None,
        unit_price: int | None = None,
    ) -> Variant:
        """Bloquea, comprueba, descuenta y registra **una** línea de venta.

        Es el único lugar donde se descuenta stock por venta. La venta de una
        sola variante y la venta manual multilínea entran las dos por acá, de
        modo que el bloqueo de fila, la comprobación de stock, la fila de
        `sales`, la disponibilidad derivada y la auditoría no pueden divergir
        entre ambos caminos.

        **Debe llamarse dentro de una transacción ya abierta.** No lleva
        `@transactional` a propósito: en una venta multilínea el `commit` tiene
        que ser uno solo para todas las líneas, no uno por línea.
        """
        variant = AdminProductRepository.find_variant_for_update(product_id, variant_id)
        if variant is None:
            raise NotFoundError("variant not found", resource="variant")

        if quantity > variant.quantity:
            raise BusinessRuleError(
                "sale quantity exceeds the stock currently loaded for this variant",
                rule="RN-82",
                field="quantity",
            )

        old_values = AuditService.snapshot(variant, VARIANT_AUDIT_FIELDS)
        variant.quantity -= quantity
        db.session.flush()
        SaleRepository.record(
            variant_id=variant.id,
            quantity=quantity,
            administrator_id=administrator_id,
            sale_order_id=sale_order_id,
            unit_price=unit_price,
        )
        cls._recompute_availability(variant.product)
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="variant",
            entity_id=variant.id,
            old_values=old_values,
            new_values=AuditService.snapshot(variant, VARIANT_AUDIT_FIELDS),
        )
        return variant

    @classmethod
    @transactional
    def register_manual_sale(cls, lineas, *, administrator_id: int) -> dict:
        """Registra una venta de una o varias líneas y descuenta el stock (RN-82).

        Una sola transacción para toda la venta: la abre `@transactional` y la
        cierra al volver. Si una línea no tiene stock, la excepción propaga, el
        decorador hace `rollback` y **no queda nada** — ni cabecera, ni líneas,
        ni descuentos de las líneas anteriores. No hay venta a medias.

        **Orden de bloqueo.** Las líneas se procesan ordenadas por `variant_id`,
        no en el orden en que las mandó el panel. Sin eso, dos ventas
        simultáneas que tocaran las mismas dos variantes en orden inverso se
        bloquearían mutuamente —cada una esperando la fila que la otra ya
        tiene— y PostgreSQL tendría que matar una por deadlock. Con un orden
        total y único, la segunda venta espera a la primera y sigue.

        **Precio.** Si la línea no trae `unit_price`, se toma el precio vigente
        del producto (`effective_price_for`, que ya concilia oferta y promoción)
        en el momento de registrar. Sea propio o heredado, ese número se guarda
        en la línea: cambiar mañana el precio del producto no toca esta venta.
        """
        if not lineas:
            raise RequestValidationError(
                [{"field": "items", "detail": "items must contain at least one line"}]
            )

        momento = datetime.now(UTC)

        # Se resuelven producto y precio antes de tomar ningún bloqueo: son
        # lecturas que no compiten, y así el tramo bloqueado es el más corto
        # posible.
        preparadas = []
        for indice, linea in enumerate(lineas):
            producto = AdminProductRepository.find_by_id(linea.product_id)
            if producto is None or producto.deleted_at is not None:
                raise NotFoundError("product not found", resource="product")

            if linea.unit_price is None:
                precio = ProductRepository.effective_price_for(producto.id, momento)
            else:
                precio = linea.unit_price

            preparadas.append(
                {
                    "indice": indice,
                    "product_id": producto.id,
                    "product_name": producto.name,
                    "variant_id": linea.variant_id,
                    "quantity": linea.quantity,
                    "unit_price": precio,
                    "subtotal": precio * linea.quantity,
                }
            )

        total = sum(linea["subtotal"] for linea in preparadas)
        # `sale_orders.total_amount` es INTEGER. El schema ya acota cada linea,
        # pero cincuenta lineas caras siguen pudiendo sumar mas de lo que entra
        # en la columna, y eso reventaria al insertar la cabecera: un 500 en
        # lugar de un error entendible. Se comprueba la suma, no solo las partes.
        if total > MAX_INTEGER:
            raise RequestValidationError(
                [{"field": "items", "detail": "the sale total is too large to record"}]
            )

        orden = SaleRepository.create_order(administrator_id=administrator_id, total_amount=total)

        vendidas = {}
        for linea in sorted(preparadas, key=lambda item: item["variant_id"]):
            variante = cls._sell_locked_variant(
                linea["product_id"],
                linea["variant_id"],
                linea["quantity"],
                administrator_id=administrator_id,
                sale_order_id=orden.id,
                unit_price=linea["unit_price"],
            )
            vendidas[linea["variant_id"]] = variante

        db.session.flush()
        return {
            "id": orden.id,
            "total_amount": orden.total_amount,
            "created_at": orden.created_at.isoformat() if orden.created_at else None,
            "administrator_id": orden.administrator_id,
            # Se devuelven en el orden en que las mandó el panel, no en el de
            # bloqueo: el resumen que ve el administrador es el suyo.
            "items": [
                {
                    "product_id": linea["product_id"],
                    "product_name": linea["product_name"],
                    "variant_id": linea["variant_id"],
                    "size": (
                        {
                            "id": vendidas[linea["variant_id"]].size_id,
                            "name": vendidas[linea["variant_id"]].size.name,
                        }
                        if vendidas[linea["variant_id"]].size
                        else None
                    ),
                    "quantity": linea["quantity"],
                    "unit_price": linea["unit_price"],
                    "subtotal": linea["subtotal"],
                    "remaining_quantity": vendidas[linea["variant_id"]].quantity,
                }
                for linea in preparadas
            ],
        }

    @classmethod
    @transactional
    def delete_variant(cls, product_id: int, variant_id: int, *, administrator_id: int):
        variant = AdminProductRepository.find_variant_by_id(product_id, variant_id)
        if variant is None:
            raise NotFoundError("variant not found", resource="variant")
        old_values = AuditService.snapshot(variant, VARIANT_AUDIT_FIELDS)
        AdminProductRepository.soft_delete_variant(variant)
        db.session.flush()
        # RN-38b: eliminar una variante con cantidad cargada cambia la suma.
        cls._recompute_availability(variant.product)
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type="variant",
            entity_id=variant.id,
            old_values=old_values,
            new_values=AuditService.snapshot(variant, VARIANT_AUDIT_FIELDS),
        )
        return {"id": variant.id, "deleted": True}

    @classmethod
    def list_images(cls, product_id: int):
        AdminProductRepository.find_by_id(product_id)
        images = AdminProductRepository.list_images(product_id)
        return [cls._image_dto(image) for image in images]

    @classmethod
    @transactional
    def create_image(
        cls,
        product_id: int,
        file_path: str,
        alt_text: str | None,
        is_primary: bool,
        *,
        administrator_id: int,
    ):
        product = AdminProductRepository.find_by_id(product_id)
        if product is None:
            raise NotFoundError("product not found", resource="product")

        count = len(AdminProductRepository.list_images(product_id))
        if is_primary:
            AdminProductRepository.set_primary_image(product_id, None)

        image = Image(
            product_id=product_id,
            file_path=file_path,
            alt_text=alt_text,
            position=count,
            is_primary=is_primary if count > 0 else True,
        )
        db.session.add(image)
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type="image",
            entity_id=image.id,
            new_values=AuditService.snapshot(image, IMAGE_AUDIT_FIELDS),
        )
        return cls._image_dto(image)

    @classmethod
    @transactional
    def update_image(cls, product_id: int, image_id: int, payload: dict, *, administrator_id: int):
        image = AdminProductRepository.find_image_by_id(product_id, image_id)
        if image is None:
            raise NotFoundError("image not found", resource="image")
        old_values = AuditService.snapshot(image, IMAGE_AUDIT_FIELDS)
        if "alt_text" in payload:
            image.alt_text = payload["alt_text"]
        db.session.flush()
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="image",
            entity_id=image.id,
            old_values=old_values,
            new_values=AuditService.snapshot(image, IMAGE_AUDIT_FIELDS),
        )
        return cls._image_dto(image)

    @classmethod
    @transactional
    def delete_image(cls, product_id: int, image_id: int, *, administrator_id: int):
        image = AdminProductRepository.find_image_by_id(product_id, image_id)
        if image is None:
            raise NotFoundError("image not found", resource="image")
        old_values = AuditService.snapshot(image, IMAGE_AUDIT_FIELDS)
        ruta = image.file_path
        image.is_active = False
        image.deleted_at = datetime.now(UTC)
        db.session.flush()

        # S-13: el borrado lógico dejaba el archivo descargable por su URL para
        # siempre. Se retira del disco, pero **sólo** si ninguna otra fila viva
        # lo referencia, y **sólo** cuando la transacción confirme.
        if AdminProductRepository.count_live_images_with_path(ruta, excluding_id=image.id) == 0:
            schedule_file_deletion(ruta)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type="image",
            entity_id=image.id,
            old_values=old_values,
            new_values=AuditService.snapshot(image, IMAGE_AUDIT_FIELDS),
        )
        return {"id": image.id, "deleted": True}

    @classmethod
    @transactional
    def set_primary_image(cls, product_id: int, image_id: int, *, administrator_id: int):
        image = AdminProductRepository.find_image_by_id(product_id, image_id)
        if image is None:
            raise NotFoundError("image not found", resource="image")
        old_values = AuditService.snapshot(image, IMAGE_AUDIT_FIELDS)
        AdminProductRepository.set_primary_image(product_id, image_id)
        # `set_primary_image` usa UPDATE masivo: el objeto en sesión está obsoleto.
        db.session.refresh(image)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="image",
            entity_id=image.id,
            old_values=old_values,
            new_values=AuditService.snapshot(image, IMAGE_AUDIT_FIELDS),
        )
        return cls._image_dto(image)

    @classmethod
    @transactional
    def reorder_images(cls, product_id: int, image_ids: list[int], *, administrator_id: int):
        old_order = [image.id for image in AdminProductRepository.list_images(product_id)]
        AdminProductRepository.reorder_images(product_id, image_ids)
        # El reordenamiento afecta al conjunto, no a una imagen concreta: el
        # registro se atribuye al producto (§14.2, snapshot selectivo).
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type="product",
            entity_id=product_id,
            old_values={"image_order": old_order},
            new_values={"image_order": list(image_ids)},
        )
        return cls.list_images(product_id)

    @classmethod
    def _record_price_change(cls, product, previous_list_price: int, administrator_id: int) -> None:
        """RN-70: todo cambio de precio deja historial, en esta misma transacción.

        §15.3 regla 2 exige que el insert acompañe al `UPDATE` de `products`; de
        eso se encarga `@transactional`, que envuelve a quien llama.

        Una actualización que no toca el precio **no** genera historial: un
        historial con filas donde el valor anterior y el nuevo coinciden no
        registra ningún cambio y estorba a `CU-A-28`.

        Alcance limitado a `list_price`: ver `PriceHistoryRepository`.
        """
        if product.list_price == previous_list_price:
            return
        PriceHistoryRepository.record(
            product_id=product.id,
            old_price=previous_list_price,
            new_price=product.list_price,
            administrator_id=administrator_id,
        )

    @classmethod
    def _insert_with_unique_slug(cls, fields: dict) -> Product:
        """Genera el slug a partir del nombre e inserta el producto (v1.2.0).

        El slug **no** es un dato que el administrador escriba (04 §9.2.1):
        se deriva de `name` con `slugify` y, si ya existe, se le suma `-2`,
        `-3`... El slug de un producto nunca se toca después de creado —
        `update()` no incluye "slug" en `_product_fields`, así que cambiar el
        nombre no rompe URLs ni referencias SEO ya compartidas.

        `products.slug` es único **contra toda la tabla, incluida la borrada
        lógicamente** (`04 §9.2.1`, sin filtro por `deleted_at`, mismo
        criterio que `RN-79` en marcas): una fila eliminada no libera su slug.

        La unicidad se verifica insertando, no con un `SELECT` previo: entre
        el `SELECT` y el `INSERT` de dos altas simultáneas con el mismo
        nombre cabría la misma colisión que se quiere evitar. Cada intento
        corre bajo su propio `SAVEPOINT` (`begin_nested`) para que un intento
        fallido no arrastre a rollback la transacción entera —incluida la
        sincronización de relaciones que hace quien llama después—, solo el
        intento de inserción.
        """
        base = slugify(fields["name"]) or "producto"
        candidate = base[:SLUG_MAX_LENGTH]

        for attempt in range(1, SLUG_MAX_ATTEMPTS + 1):
            # RN-38b: nace sin variantes con cantidad cargada, así que nace
            # "no disponible"; `_recompute_availability` la corrige apenas
            # haya variantes con stock real.
            product = Product(**fields, slug=candidate, availability=derive_availability(0))
            try:
                with db.session.begin_nested():
                    db.session.add(product)
                    db.session.flush()
            except IntegrityError as error:
                if "uq_products_slug" not in str(getattr(error, "orig", error)):
                    raise
                sufijo = f"-{attempt + 1}"
                candidate = f"{base[: SLUG_MAX_LENGTH - len(sufijo)]}{sufijo}"
                continue
            return product

        raise BusinessRuleError("could not generate a unique product slug", rule="RN-slug")

    @classmethod
    def _product_fields(cls, payload: dict) -> dict:
        required = [
            "name",
            "sku",
            "list_price",
            "primary_category_id",
            "brand_id",
            "size_type_id",
        ]
        for field in required:
            if not payload.get(field):
                raise BadRequestError(f"El campo {field} es obligatorio")
        # RN-09 (v2.9.0): `genders` es una lista, no un entero — no encaja en
        # el chequeo genérico de arriba (`not []` también es `True`, así que
        # en los hechos sí lo cubre, pero el mensaje sería el de un campo que
        # ya no existe).
        if not payload.get("gender_ids"):
            raise BadRequestError("El campo gender_ids es obligatorio")

        return {
            "name": payload["name"].strip(),
            "sku": payload["sku"].strip(),
            "description": payload.get("description") or None,
            "list_price": int(payload["list_price"]),
            "sale_price": payload.get("sale_price") or None,
            "sale_starts_at": payload.get("sale_starts_at") or None,
            "sale_ends_at": payload.get("sale_ends_at") or None,
            # RN-38b (v1.4.0): `availability` ya no es un campo de entrada —
            # se deriva de `variants.quantity` en `_recompute_availability`.
            # Cualquier `availability` que llegue en el payload se ignora,
            # mismo criterio que `slug` (05_API.md §10.4).
            "is_active": payload.get("is_active", True),
            "is_featured": payload.get("is_featured", False),
            "is_new": payload.get("is_new", False),
            "primary_category_id": int(payload["primary_category_id"]),
            "brand_id": int(payload["brand_id"]),
            "size_type_id": int(payload["size_type_id"]),
        }

    @classmethod
    def _sync_relations(cls, product: Product, payload: dict):
        product.categories = [
            CategoryRepository.find_by_id(cid) for cid in (payload.get("category_ids") or []) if cid
        ]
        product.sports = [
            SportRepository.find_by_id(sid) for sid in (payload.get("sport_ids") or []) if sid
        ]
        product.genders = [
            GenderRepository.find_by_id(gid) for gid in (payload.get("gender_ids") or []) if gid
        ]
        sizes = [SizeRepository.find_by_id(sid) for sid in (payload.get("size_ids") or []) if sid]
        cls._validate_sizes_match_type(product, sizes)
        product.sizes = sizes

    @classmethod
    def _validate_sizes_match_type(cls, product: Product, sizes: list) -> None:
        """RN-15b: un talle asignado debe pertenecer al tipo de talle del producto.

        `ProductForm.jsx` ya filtra los talles ofrecidos por `size_type_id`
        elegido, pero eso es solo cliente — sin este control, una petición
        directa a la API podía asignar, por ejemplo, "L" a un producto de
        calzado.
        """
        incoherentes = [
            size for size in sizes if size is not None and size.size_type_id != product.size_type_id
        ]
        if incoherentes:
            nombres = ", ".join(sorted({size.name for size in incoherentes}))
            raise RequestValidationError(
                [
                    {
                        "field": "size_ids",
                        "detail": (
                            f"El talle no pertenece al tipo de talle del producto: {nombres}"
                        ),
                    }
                ]
            )

    @classmethod
    def _sync_variants(cls, product: Product):
        """Genera las variantes que faltan (`AD-15`).

        La variante nueva se agrega vía `product.variants.append(...)` y no
        con `db.session.add(Variant(product_id=product.id, ...))`: la línea
        de `existing`, justo arriba, ya carga `product.variants` en memoria
        (queda cacheada en la sesión). Crear la variante suelta con
        `db.session.add` la persiste igual, pero no la agrega a esa
        colección ya cacheada — cualquier lectura posterior de
        `product.variants` **en la misma request** (acá, en
        `_recompute_availability`, y en la respuesta que arma
        `_to_admin_detail_dto`) seguía viendo la lista vieja, sin la
        variante recién creada. Confirmado con un caso real: `POST
        /admin/products` con talles asignados devolvía `variants: []` en el
        mismo cuerpo de la respuesta, aunque la fila sí se hubiera grabado.
        `.append()` en la colección ya cargada evita el desfasaje sin tocar
        el modelo ni el contrato — el `product_id` lo completa la relación
        al volcar los cambios.
        """
        if not product.sizes:
            return

        existing = {v.size_id: v for v in product.variants if v.deleted_at is None}

        for size in product.sizes:
            if size.id not in existing:
                product.variants.append(Variant(size_id=size.id))

    @classmethod
    def _recompute_availability(cls, product: Product) -> None:
        """RN-38b: `products.availability` es la suma de `quantity` vivas.

        Se persiste como columna (no se calcula en cada lectura) para no
        romper el filtro `?availability=` ni `idx_products_availability`
        (`04_BASE_DATOS.md` §9.2.1 v1.2.0) — pero el administrador ya no la
        escribe directamente, solo este método la toca.
        """
        total = sum(v.quantity for v in product.variants if v.deleted_at is None)
        product.availability = derive_availability(total)

    @classmethod
    def _variant_dto(cls, variant: Variant) -> dict:
        return {
            "id": variant.id,
            "size": {"id": variant.size_id, "name": variant.size.name} if variant.size else None,
            "quantity": variant.quantity,
            "availability": derive_availability(variant.quantity),
        }

    @classmethod
    def _to_admin_list_dto(cls, product: Product) -> dict:
        return {
            "id": product.id,
            "name": product.name,
            "slug": product.slug,
            "sku": product.sku,
            "brand": {
                "id": product.brand_id,
                "name": product.brand.name if product.brand else None,
            },
            "primary_category": {
                "id": product.primary_category_id,
                "name": product.primary_category.name if product.primary_category else None,
            },
            "list_price": product.list_price,
            "availability": product.availability,
            "is_active": product.is_active,
            "is_featured": product.is_featured,
            "is_new": product.is_new,
            "home_new_position": product.home_new_position,
            "has_image": bool(product.images),
            "deleted_at": product.deleted_at.isoformat() if product.deleted_at else None,
        }

    @classmethod
    def _to_admin_detail_dto(cls, product: Product) -> dict:
        dto = cls._to_admin_list_dto(product)
        dto.update(
            {
                "description": product.description,
                "sale_price": product.sale_price,
                # El precio que se cobra hoy, con oferta y promocion ya
                # conciliadas (es la misma expresion que usa el catalogo
                # publico). El panel lo necesita para proponer un precio al
                # registrar una venta: sin esto tendria que reimplementar la
                # regla en el cliente y las dos copias se irian separando.
                "effective_price": ProductRepository.effective_price_for(
                    product.id, datetime.now(UTC)
                ),
                "sale_starts_at": (
                    product.sale_starts_at.isoformat() if product.sale_starts_at else None
                ),
                "sale_ends_at": product.sale_ends_at.isoformat() if product.sale_ends_at else None,
                "categories": [{"id": c.id, "name": c.name} for c in product.categories],
                "sports": [{"id": s.id, "name": s.name} for s in product.sports],
                "sizes": [{"id": s.id, "name": s.name} for s in product.sizes],
                # RN-09 (v2.9.0): lista, ya no un solo `gender_id`.
                "genders": [{"id": g.id, "name": g.name, "slug": g.slug} for g in product.genders],
                "size_type": {
                    "id": product.size_type_id,
                    "name": product.size_type.name if product.size_type else None,
                    "slug": product.size_type.slug if product.size_type else None,
                },
                "variants": [cls._variant_dto(v) for v in product.variants if v.deleted_at is None],
                "images": [
                    cls._image_dto(image) for image in product.images if image.deleted_at is None
                ],
            }
        )
        return dto

    @classmethod
    def _image_dto(cls, image: Image) -> dict:
        return {
            "id": image.id,
            # §10.6: `image_url` es la **URL pública**, no la ruta almacenada. La
            # ruta interna nunca sale de la API (05_API.md §4.9).
            "image_url": public_file_url(image.file_path),
            "is_primary": image.is_primary,
            "position": image.position,
            "alt_text": image.alt_text,
        }
