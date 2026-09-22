"""Admin data access for products, variants and images."""

from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.orm import joinedload, selectinload

from ..extensions import db
from ..models import (
    Brand,
    Category,
    Image,
    Product,
    Variant,
    product_categories,
)


class AdminProductRepository:
    @classmethod
    def _filtered(
        cls,
        *,
        search: str | None,
        brand_slugs: list[str] | None,
        category_slugs: list[str] | None,
        availability: list[str] | None,
        is_active: bool | None,
    ):
        """Predicados compartidos por el listado y el conteo.

        Que ambos compartan filtros no es cosmético: si difieren, `total` deja de
        corresponder a las filas devueltas y la paginación miente.
        """
        statement = select(Product)

        # §9.3: el panel nunca lista los productos eliminados (`AD-18`).
        statement = statement.where(Product.deleted_at.is_(None))

        if search:
            pattern = f"%{search.lower()}%"
            statement = statement.where(
                (Product.name.ilike(pattern))
                | (Product.sku.ilike(pattern))
                | (Product.slug.ilike(pattern))
            )
        if brand_slugs:
            statement = statement.where(
                Product.brand_id.in_(select(Brand.id).where(Brand.slug.in_(brand_slugs)))
            )
        if category_slugs:
            # AD-29: la categoría abarca a sus descendientes, y el producto puede
            # estar asociado por categoría principal o por la tabla intermedia.
            matching = select(Category.id).where(Category.slug.in_(category_slugs))
            descendants = select(Category.id).where(Category.parent_id.in_(matching))
            category_ids = matching.union(descendants).subquery()
            statement = statement.where(
                Product.primary_category_id.in_(select(category_ids.c.id))
                | select(product_categories.c.product_id)
                .where(
                    product_categories.c.category_id.in_(select(category_ids.c.id)),
                    product_categories.c.product_id == Product.id,
                )
                .correlate(Product)
                .exists()
            )
        if availability:
            statement = statement.where(Product.availability.in_(availability))
        if is_active is not None:
            statement = statement.where(Product.is_active.is_(is_active))

        return statement

    @classmethod
    def list_all(
        cls,
        *,
        offset: int = 0,
        limit: int = 20,
        search: str | None = None,
        brand_slugs: list[str] | None = None,
        category_slugs: list[str] | None = None,
        availability: list[str] | None = None,
        is_active: bool | None = None,
        sort: str = "name_asc",
    ):
        statement = cls._filtered(
            search=search,
            brand_slugs=brand_slugs,
            category_slugs=category_slugs,
            availability=availability,
            is_active=is_active,
        )

        # §9.3: conjunto cerrado de ordenamientos. Un valor no reconocido cae al
        # canónico (§4.6). `id` desempata para que la paginación sea estable.
        orderings = {
            "name_asc": Product.name.asc(),
            "name_desc": Product.name.desc(),
            "created_desc": Product.created_at.desc(),
            "updated_desc": Product.updated_at.desc(),
            "price_asc": Product.list_price.asc(),
            "price_desc": Product.list_price.desc(),
        }
        statement = statement.order_by(orderings.get(sort, Product.name.asc()), Product.id.asc())
        statement = statement.options(
            joinedload(Product.brand),
            joinedload(Product.primary_category),
            selectinload(Product.images),
        )
        return list(db.session.execute(statement.offset(offset).limit(limit)).unique().scalars())

    @classmethod
    def count_all(
        cls,
        *,
        search: str | None = None,
        brand_slugs: list[str] | None = None,
        category_slugs: list[str] | None = None,
        availability: list[str] | None = None,
        is_active: bool | None = None,
    ) -> int:
        statement = cls._filtered(
            search=search,
            brand_slugs=brand_slugs,
            category_slugs=category_slugs,
            availability=availability,
            is_active=is_active,
        )
        return db.session.execute(
            select(db.func.count()).select_from(statement.subquery())
        ).scalar_one()

    @classmethod
    def next_home_new_position(cls) -> int:
        """Siguiente lugar libre en Novedades: agregar siempre va al final.

        Mismo criterio que `reorder_images` con `position`, pero acá no hay
        reordenamiento manual — el orden es el orden en que se fue
        seleccionando cada producto.
        """
        statement = select(db.func.coalesce(db.func.max(Product.home_new_position), -1) + 1)
        return db.session.execute(statement).scalar_one()

    @classmethod
    def find_by_id(cls, product_id: int) -> Product | None:
        statement = (
            select(Product)
            .where(Product.id == product_id)
            .options(
                joinedload(Product.brand),
                joinedload(Product.primary_category),
                joinedload(Product.size_type),
                selectinload(Product.categories),
                selectinload(Product.sports),
                selectinload(Product.genders),
                selectinload(Product.sizes),
                selectinload(Product.variants).joinedload(Variant.size),
                selectinload(Product.images),
            )
        )
        return db.session.execute(statement).unique().scalar_one_or_none()

    @classmethod
    def find_variant_by_id(cls, product_id: int, variant_id: int) -> Variant | None:
        statement = select(Variant).where(
            Variant.id == variant_id,
            Variant.product_id == product_id,
            Variant.deleted_at.is_(None),
        )
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def find_variant_for_update(cls, product_id: int, variant_id: int) -> Variant | None:
        """Igual que `find_variant_by_id`, pero bloqueando la fila (`RN-82`).

        `SELECT ... FOR UPDATE`: mientras la transacción siga abierta, ninguna
        otra puede leer esta misma fila con intención de escribirla — queda
        esperando. Es lo que convierte «leer el stock, comprobarlo y
        descontarlo» en una operación indivisible.

        Sin el bloqueo, dos ventas simultáneas del mismo talle leían ambas el
        mismo número, ambas pasaban la comprobación y ambas escribían un valor
        calculado sobre el stock viejo: la segunda pisaba a la primera y se
        vendían más unidades de las que había.

        Solo lo usa el registro de venta. La carga manual de stock
        (`set_variant_quantity`) asigna un valor absoluto y no depende de lo que
        leyó, así que no necesita el bloqueo; su `UPDATE` toma igualmente el
        candado de fila de PostgreSQL y no puede colarse en medio de una venta.
        """
        statement = (
            select(Variant)
            .where(
                Variant.id == variant_id,
                Variant.product_id == product_id,
                Variant.deleted_at.is_(None),
            )
            .with_for_update()
            # Sin esto el bloqueo es una ilusion. `session.execute(select(...))`
            # devuelve la instancia que ya este en el identity map SIN releer sus
            # columnas: si algo cargo la variante antes en la misma peticion —la
            # venta manual carga el producto con `selectinload(Product.variants)`
            # para resolver el precio—, el `SELECT ... FOR UPDATE` toma el
            # candado, pero `variant.quantity` sigue siendo el valor leido ANTES
            # de esperarlo. Dos ventas simultaneas volvian a perder una: cada una
            # descontaba sobre el mismo numero viejo.
            #
            # `populate_existing` obliga a sobrescribir el estado en memoria con
            # lo que devuelve esta consulta, que es la fila ya bloqueada. Es el
            # unico modo de que "leer, comprobar y descontar" opere sobre el
            # valor real. Lo encontro el test de dos ventas concurrentes que si
            # caben en stock: ambas respondian 201 y solo una descontaba.
            .execution_options(populate_existing=True)
        )
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def soft_delete_variant(cls, variant: Variant):
        variant.deleted_at = datetime.now(UTC)
        db.session.flush()
        return variant

    @classmethod
    def list_images(cls, product_id: int):
        statement = (
            select(Image)
            .where(
                Image.product_id == product_id,
                Image.deleted_at.is_(None),
            )
            .order_by(Image.position.asc(), Image.id.asc())
        )
        return list(db.session.execute(statement).scalars())

    @classmethod
    def find_image_by_id(cls, product_id: int, image_id: int) -> Image | None:
        statement = select(Image).where(
            Image.id == image_id,
            Image.product_id == product_id,
            Image.deleted_at.is_(None),
        )
        return db.session.execute(statement).scalar_one_or_none()

    @classmethod
    def count_live_images_with_path(cls, file_path: str, *, excluding_id: int) -> int:
        """Cuántas filas VIVAS distintas de `excluding_id` apuntan a ese archivo.

        S-13: dos altas del mismo archivo en el mismo producto producen la misma
        huella y, por tanto, la **misma ruta**. Borrar el archivo al eliminar una
        de las filas dejaría a la otra apuntando al vacío, así que sólo se borra
        cuando ya no queda ninguna referencia viva.
        """
        statement = (
            select(func.count())
            .select_from(Image)
            .where(
                Image.file_path == file_path,
                Image.id != excluding_id,
                Image.deleted_at.is_(None),
            )
        )
        return db.session.execute(statement).scalar_one()

    @classmethod
    def set_primary_image(cls, product_id: int, image_id: int):
        db.session.execute(
            update(Image)
            .where(Image.product_id == product_id, Image.deleted_at.is_(None))
            .values(is_primary=False)
        )
        db.session.execute(update(Image).where(Image.id == image_id).values(is_primary=True))
        db.session.flush()

    @classmethod
    def reorder_images(cls, product_id: int, image_ids: list[int]):
        for position, image_id in enumerate(image_ids):
            db.session.execute(
                update(Image)
                .where(Image.id == image_id, Image.product_id == product_id)
                .values(position=position)
            )
        db.session.flush()
