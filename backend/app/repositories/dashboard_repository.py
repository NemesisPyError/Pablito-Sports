"""Lecturas agregadas del dashboard (05_API.md §9.2, §10.8; `RF-38`, `RF-39`).

`DashboardDTO` **no representa una entidad persistente**: se computa sobre
`products`, `images`, `product_categories` y `price_history` (§10.8). Este
repositorio solo lee y solo cuenta; no abre transacción (10_BACKEND.md §14.1
regla 3).

La vigencia de ofertas y promociones no se reimplementa aquí: se reutilizan las
expresiones de `ProductRepository`, que ya materializan `RN-30` a `RN-37`.
Duplicarlas abriría la puerta a que el dashboard y el catálogo discrepen sobre
qué está en oferta.
"""

from datetime import datetime

from sqlalchemy import exists, func, or_, select

from ..extensions import db
from ..models import Image, Product, product_categories
from .product_repository import ProductRepository

# §10.8: los tres estados de `RN-38b` (v1.4.0), en el orden del contrato.
AVAILABILITY_STATES = ("available", "low_stock", "out_of_stock")


class DashboardRepository:
    @staticmethod
    def _not_deleted():
        """§10.8: todos los totales se cuentan sobre productos **no eliminados**.

        `totals.total` lo dice explícitamente y `active`/`hidden` lo repiten; los
        de disponibilidad heredan el mismo alcance, porque de otro modo la suma
        de los cuatro estados no cuadraría con el total.
        """
        return Product.deleted_at.is_(None)

    @classmethod
    def count_products(cls) -> int:
        """`totals.total`."""
        return db.session.execute(
            select(func.count()).select_from(Product).where(cls._not_deleted())
        ).scalar_one()

    @classmethod
    def count_by_active(cls, *, is_active: bool) -> int:
        """`totals.active` y `totals.hidden`."""
        return db.session.execute(
            select(func.count())
            .select_from(Product)
            .where(cls._not_deleted(), Product.is_active.is_(is_active))
        ).scalar_one()

    @classmethod
    def count_by_availability(cls) -> dict[str, int]:
        """`totals.available`, `low_stock` y `out_of_stock` (v1.4.0).

        Una sola consulta agrupada en lugar de cuatro: el resultado es el mismo y
        el dashboard es una pantalla de carga frecuente.
        """
        filas = db.session.execute(
            select(Product.availability, func.count())
            .where(cls._not_deleted())
            .group_by(Product.availability)
        )
        contados = dict(filas.all())
        # Un estado sin productos debe aparecer en cero, no ausente: el contrato
        # declara los cuatro campos como obligatorios.
        return {estado: contados.get(estado, 0) for estado in AVAILABILITY_STATES}

    @classmethod
    def count_on_sale(cls, moment: datetime) -> int:
        """`totals.on_sale`: "con oferta o promoción vigente".

        Las dos rutas al descuento son la oferta cargada en el producto
        (`RN-30` a `RN-33`) y una promoción vigente que lo alcance (`RN-36`,
        `RN-37`). Basta con una de ellas.
        """
        oferta_vigente = ProductRepository._product_sale_price(moment) < Product.list_price
        promocion_vigente = ProductRepository._best_promotion_percentage(moment).is_not(None)

        return db.session.execute(
            select(func.count())
            .select_from(Product)
            .where(cls._not_deleted(), or_(oferta_vigente, promocion_vigente))
        ).scalar_one()

    @classmethod
    def list_incomplete(cls, limit: int) -> list[tuple]:
        """`RF-39`: productos sin imagen, sin precio o sin categoría.

        Devuelve `(id, slug, name, sin_imagen, sin_precio, sin_categoria)`. Qué
        significa cada carencia lo decide §10.8 junto con el esquema:

        - **imagen**: ninguna fila viva en `images`.
        - **categoría**: ninguna fila en `product_categories`. §10.8 nombra esa
          tabla entre las fuentes del DTO, y es la única lectura posible:
          `primary_category_id` es `NOT NULL` (04 §9.2.1), así que un producto
          nunca carece de categoría principal.
        - **precio**: `list_price` es `NOT NULL` con `CHECK (list_price > 0)`,
          de modo que la condición no puede darse hoy. Se evalúa igualmente para
          no dejar el contrato a medias si la restricción cambiara.
        """
        sin_imagen = ~exists(
            select(Image.id).where(Image.product_id == Product.id, Image.deleted_at.is_(None))
        )
        sin_categoria = ~exists(
            select(product_categories.c.product_id).where(
                product_categories.c.product_id == Product.id
            )
        )
        sin_precio = Product.list_price <= 0

        statement = (
            select(
                Product.id,
                Product.slug,
                Product.name,
                sin_imagen.label("sin_imagen"),
                sin_precio.label("sin_precio"),
                sin_categoria.label("sin_categoria"),
            )
            .where(cls._not_deleted(), or_(sin_imagen, sin_precio, sin_categoria))
            .order_by(Product.name.asc(), Product.id.asc())
            .limit(limit)
        )
        return list(db.session.execute(statement).all())
