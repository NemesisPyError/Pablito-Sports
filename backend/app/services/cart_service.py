"""Cart revalidation rules (RN-56, AD-25, AD-28, AD-36).

The server never modifies the client's cart: it reports the authoritative state
and the client applies the resolution matrix (§8.5).

Scope of `status`. AD-36 forbids the client from sending prices, so the server
holds no baseline to compare against. It therefore reports the states that depend
only on current existence and visibility — `ok`, `product_hidden`,
`product_deleted`, `variant_removed` — and always returns the current price and
availability. The comparison states of §8.4 — `price_changed`, `sale_ended`,
`availability_changed` — are derived by the client against its own snapshot, as
§8.5 and 06_FRONTEND.md §11.5 prescribe.

`insufficient_stock` (RN-54b) is the exception that does depend on a quantity,
and precisely because that quantity cannot be trusted from the client: the cart
lives in the browser (AD-06) and this endpoint is the only place where the server
sees it (AD-32). Checking `variants.quantity` here is what stops a tampered or
stale cart from ordering more units than exist.
"""

from datetime import UTC, datetime

from ..core.utils.stock import max_orderable_units, public_available_quantity
from ..dtos.cart_dtos import (
    STATUS_INSUFFICIENT_STOCK,
    STATUS_OK,
    STATUS_PRODUCT_DELETED,
    STATUS_PRODUCT_HIDDEN,
    STATUS_VARIANT_REMOVED,
    CartItemStateDTO,
)
from ..mappers.cart_mappers import available_item, product_to_cart_ref, unavailable_item
from ..repositories.product_repository import ProductRepository
from ..repositories.variant_repository import VariantRepository
from ..schemas.cart_schemas import CartRevalidationInput
from .product_service import ProductService


class CartService:
    @staticmethod
    def revalidate(
        payload: CartRevalidationInput, moment: datetime | None = None
    ) -> list[CartItemStateDTO]:
        """§8.3: one entry per variant_id received, in the same order."""
        now = moment or datetime.now(UTC)

        variants = VariantRepository.find_by_ids_with_product(
            [item.variant_id for item in payload.items]
        )

        visible_product_ids = [
            variant.product_id
            for variant in variants.values()
            if variant.deleted_at is None
            and variant.product.deleted_at is None
            and variant.product.is_active
        ]
        thumbnails = ProductRepository.thumbnail_paths_for(visible_product_ids)

        results: list[CartItemStateDTO] = []
        for item in payload.items:
            variant = variants.get(item.variant_id)

            if variant is None or variant.deleted_at is not None:
                results.append(unavailable_item(item.variant_id, STATUS_VARIANT_REMOVED))
                continue

            product = variant.product
            if product.deleted_at is not None:
                results.append(unavailable_item(item.variant_id, STATUS_PRODUCT_DELETED))
                continue
            if not product.is_active:
                results.append(unavailable_item(item.variant_id, STATUS_PRODUCT_HIDDEN))
                continue

            effective_price = ProductRepository.effective_price_for(product.id, now)
            sale_price, discount = ProductService._price_fields(product.list_price, effective_price)

            # RN-54b: el stock real manda sobre la cantidad que llegó del
            # navegador. `variants.quantity` es la única fuente de verdad y se
            # comprueba acá aunque el cliente ya la haya mirado: el frontend
            # limita para no frustrar, el servidor limita para no vender lo que
            # no hay. El talle agotado sigue entrando con una unidad (RN-40, es
            # un carrito de consulta), pero no con más.
            if item.quantity > max_orderable_units(variant.quantity):
                results.append(
                    available_item(
                        item.variant_id,
                        status=STATUS_INSUFFICIENT_STOCK,
                        product_ref=product_to_cart_ref(product, thumbnails.get(product.id)),
                        list_price=product.list_price,
                        sale_price=sale_price,
                        discount_percentage=discount,
                        availability=product.availability,
                        quantity=item.quantity,
                        # Acá el número siempre viaja, aunque supere el umbral
                        # de divulgación: sin él el cliente no puede recortar la
                        # línea ni explicar por qué, y ya está intentando
                        # comprar esa cantidad exacta.
                        available_quantity=variant.quantity,
                    )
                )
                continue

            results.append(
                available_item(
                    item.variant_id,
                    status=STATUS_OK,
                    product_ref=product_to_cart_ref(product, thumbnails.get(product.id)),
                    list_price=product.list_price,
                    sale_price=sale_price,
                    discount_percentage=discount,
                    availability=product.availability,
                    quantity=item.quantity,
                    available_quantity=public_available_quantity(variant.quantity),
                )
            )

        return results
