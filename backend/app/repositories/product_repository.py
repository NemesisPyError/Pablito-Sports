"""Product data access: catalog query, facets and detail.

The effective price (RN-30 to RN-37) is expressed in SQL because sorting by price,
the `on_sale` filter and pagination must all agree on the same number.

The repository receives simple criteria and returns rows; it decides no business
rule (DEP-04) and never issues a physical DELETE (AD-18).
"""

from dataclasses import dataclass, field
from datetime import datetime

from sqlalchemy import Integer, and_, case, func, or_, select
from sqlalchemy.orm import joinedload, selectinload

from ..extensions import db
from ..models import (
    Brand,
    Category,
    Gender,
    Image,
    Product,
    Promotion,
    Size,
    Sport,
    Variant,
    product_categories,
    product_sizes,
    product_sports,
)


@dataclass
class ProductQuery:
    """Normalised catalog criteria (05_API.md §7.3, RN-46)."""

    search: str | None = None
    brand_ids: list[int] = field(default_factory=list)
    category_ids: list[int] = field(default_factory=list)
    gender_ids: list[int] = field(default_factory=list)
    sport_ids: list[int] = field(default_factory=list)
    size_ids: list[int] = field(default_factory=list)
    min_price: int | None = None
    max_price: int | None = None
    on_sale: bool | None = None
    is_new: bool | None = None
    is_featured: bool | None = None
    sort: str = "name_asc"


class ProductRepository:
    # ------------------------------------------------------------------
    # Price expressions (RN-30 to RN-37)
    # ------------------------------------------------------------------

    @staticmethod
    def _product_sale_price(moment: datetime):
        """RN-32, RN-33: the loaded sale price only counts while it is in force.

        Outside its window the list price applies, even though sale_price is set.
        """
        return case(
            (
                and_(
                    Product.sale_price.is_not(None),
                    or_(Product.sale_starts_at.is_(None), Product.sale_starts_at <= moment),
                    or_(Product.sale_ends_at.is_(None), Product.sale_ends_at > moment),
                ),
                Product.sale_price,
            ),
            else_=Product.list_price,
        )

    @staticmethod
    def _best_promotion_percentage(moment: datetime):
        """RN-37: among concurrent promotions the largest discount wins.

        RN-36 scopes a promotion to one product, one category or one brand.
        """
        return (
            select(func.max(Promotion.discount_percentage))
            .where(
                Promotion.is_active.is_(True),
                Promotion.deleted_at.is_(None),
                Promotion.starts_at <= moment,
                or_(Promotion.ends_at.is_(None), Promotion.ends_at > moment),
                or_(
                    Promotion.product_id == Product.id,
                    Promotion.brand_id == Product.brand_id,
                    Promotion.category_id.in_(
                        select(product_categories.c.category_id).where(
                            product_categories.c.product_id == Product.id
                        )
                    ),
                ),
            )
            .correlate(Product)
            .scalar_subquery()
        )

    @classmethod
    def _effective_price(cls, moment: datetime):
        """The lowest price the customer actually pays.

        The product sale and an active promotion are both routes to a discount
        (§7.3, `on_sale`); whichever leaves the lower price is the effective one.
        """
        promotion_price = func.floor(
            Product.list_price
            * (100 - func.coalesce(cls._best_promotion_percentage(moment), 0))
            / 100.0
        ).cast(Integer)
        return func.least(cls._product_sale_price(moment), promotion_price)

    # ------------------------------------------------------------------
    # Catalog query
    # ------------------------------------------------------------------

    @staticmethod
    def _visible():
        """RN-01, RN-02, AD-18: only active, non-deleted products are public."""
        return and_(Product.is_active.is_(True), Product.deleted_at.is_(None))

    @classmethod
    def _apply_filters(cls, statement, query: ProductQuery, moment: datetime):
        statement = statement.where(cls._visible())

        if query.search:
            # RN-48, AD-21: name, brand, category and sport, accent-insensitive.
            pattern = f"%{query.search.lower()}%"
            matches_sport = (
                select(product_sports.c.product_id)
                .join(Sport, Sport.id == product_sports.c.sport_id)
                .where(
                    product_sports.c.product_id == Product.id,
                    func.lower(func.immutable_unaccent(Sport.name)).like(pattern),
                )
                .correlate(Product)
                .exists()
            )
            matches_category = (
                select(product_categories.c.product_id)
                .join(Category, Category.id == product_categories.c.category_id)
                .where(
                    product_categories.c.product_id == Product.id,
                    func.lower(func.immutable_unaccent(Category.name)).like(pattern),
                )
                .correlate(Product)
                .exists()
            )
            statement = statement.where(
                or_(
                    func.lower(func.immutable_unaccent(Product.name)).like(pattern),
                    Product.brand_id.in_(
                        select(Brand.id).where(
                            func.lower(func.immutable_unaccent(Brand.name)).like(pattern)
                        )
                    ),
                    matches_category,
                    matches_sport,
                )
            )

        if query.brand_ids:
            statement = statement.where(Product.brand_id.in_(query.brand_ids))
        if query.gender_ids:
            statement = statement.where(Product.gender_id.in_(query.gender_ids))
        if query.category_ids:
            statement = statement.where(
                select(product_categories.c.product_id)
                .where(
                    product_categories.c.product_id == Product.id,
                    product_categories.c.category_id.in_(query.category_ids),
                )
                .correlate(Product)
                .exists()
            )
        if query.sport_ids:
            statement = statement.where(
                select(product_sports.c.product_id)
                .where(
                    product_sports.c.product_id == Product.id,
                    product_sports.c.sport_id.in_(query.sport_ids),
                )
                .correlate(Product)
                .exists()
            )
        if query.size_ids:
            statement = statement.where(
                select(product_sizes.c.product_id)
                .where(
                    product_sizes.c.product_id == Product.id,
                    product_sizes.c.size_id.in_(query.size_ids),
                )
                .correlate(Product)
                .exists()
            )

        effective_price = cls._effective_price(moment)
        if query.min_price is not None:
            statement = statement.where(effective_price >= query.min_price)
        if query.max_price is not None:
            statement = statement.where(effective_price <= query.max_price)
        if query.on_sale is True:
            statement = statement.where(effective_price < Product.list_price)
        if query.on_sale is False:
            statement = statement.where(effective_price >= Product.list_price)
        if query.is_new is not None:
            statement = statement.where(Product.is_new.is_(query.is_new))
        if query.is_featured is not None:
            statement = statement.where(Product.is_featured.is_(query.is_featured))

        return statement

    @classmethod
    def _apply_sort(cls, statement, sort: str, moment: datetime):
        """§7.3: `sort` is a closed set; the tie-break keeps pagination stable."""
        effective_price = cls._effective_price(moment)
        orderings = {
            "name_asc": (Product.name.asc(),),
            "name_desc": (Product.name.desc(),),
            "price_asc": (effective_price.asc(),),
            "price_desc": (effective_price.desc(),),
            "newest": (Product.created_at.desc(),),
            "featured": (Product.is_featured.desc(), Product.name.asc()),
        }
        return statement.order_by(*orderings[sort], Product.id.asc())

    @classmethod
    def count(cls, query: ProductQuery, moment: datetime) -> int:
        statement = cls._apply_filters(select(Product.id), query, moment)
        return db.session.execute(
            select(func.count()).select_from(statement.subquery())
        ).scalar_one()

    @classmethod
    def list_catalog(
        cls, query: ProductQuery, moment: datetime, *, offset: int, limit: int
    ) -> list[tuple]:
        """Returns (product, effective_price) rows with brand and category loaded."""
        statement = select(Product, cls._effective_price(moment).label("effective_price")).options(
            joinedload(Product.brand), joinedload(Product.primary_category)
        )
        statement = cls._apply_filters(statement, query, moment)
        statement = cls._apply_sort(statement, query.sort, moment)
        return list(db.session.execute(statement.offset(offset).limit(limit)).all())

    @classmethod
    def matching_ids(cls, query: ProductQuery, moment: datetime):
        """Subquery of the ids the current selection yields, used for facets."""
        return cls._apply_filters(select(Product.id), query, moment).subquery()

    # ------------------------------------------------------------------
    # Facets (RN-47)
    # ------------------------------------------------------------------

    @classmethod
    def facet_by_direct_column(cls, model, column, matching_ids) -> list[tuple]:
        """Counts for a classification referenced straight from products."""
        statement = (
            select(model.slug, model.name, func.count(Product.id))
            .join(Product, column == model.id)
            .where(Product.id.in_(select(matching_ids.c.id)))
            .where(model.is_active.is_(True), model.deleted_at.is_(None))
            .group_by(model.slug, model.name)
            .order_by(func.count(Product.id).desc(), model.name.asc())
        )
        return list(db.session.execute(statement).all())

    @classmethod
    def facet_by_association(cls, model, association, model_fk, matching_ids) -> list[tuple]:
        """Counts for a classification reached through an N:M relation table."""
        statement = (
            select(model.slug, model.name, func.count(association.c.product_id))
            .join(association, model_fk == model.id)
            .where(association.c.product_id.in_(select(matching_ids.c.id)))
            .where(model.is_active.is_(True), model.deleted_at.is_(None))
            .group_by(model.slug, model.name)
            .order_by(func.count(association.c.product_id).desc(), model.name.asc())
        )
        return list(db.session.execute(statement).all())

    # ------------------------------------------------------------------
    # Detail
    # ------------------------------------------------------------------

    @classmethod
    def find_visible_by_slug(cls, slug: str) -> Product | None:
        """CE-13, CE-14: hidden or deleted products are simply not found."""
        statement = (
            select(Product)
            .where(cls._visible(), Product.slug == slug)
            .options(
                joinedload(Product.brand),
                joinedload(Product.primary_category),
                joinedload(Product.gender),
                joinedload(Product.size_type),
                selectinload(Product.categories),
                selectinload(Product.sports),
                selectinload(Product.sizes).joinedload(Size.size_type),
            )
        )
        return db.session.execute(statement).unique().scalar_one_or_none()

    @classmethod
    def list_visible_for_sitemap(cls) -> list[Product]:
        """Every visible product, for the sitemap and the crawler catalog (AD-09).

        Without pagination on purpose: a sitemap that only lists the first page
        leaves the rest of the catalog undiscovered. Only the three columns the
        callers need are read, so the row stays cheap with the whole catalog
        loaded: `name` is the anchor text of the crawler catalog, and
        `updated_at` feeds `<lastmod>`.
        """
        statement = (
            select(Product.slug, Product.name, Product.updated_at)
            .where(cls._visible())
            .order_by(Product.updated_at.desc())
        )
        return list(db.session.execute(statement))

    @classmethod
    def effective_price_for(cls, product_id: int, moment: datetime) -> int:
        statement = select(cls._effective_price(moment)).where(Product.id == product_id)
        return db.session.execute(statement).scalar_one()

    @classmethod
    def list_active_images(cls, product_id: int) -> list[Image]:
        """§10.4: ordered by position; hidden and deleted images are excluded."""
        statement = (
            select(Image)
            .where(
                Image.product_id == product_id,
                Image.is_active.is_(True),
                Image.deleted_at.is_(None),
            )
            .order_by(Image.position.asc(), Image.id.asc())
        )
        return list(db.session.execute(statement).scalars())

    @classmethod
    def list_live_variants(cls, product_id: int) -> list[Variant]:
        statement = (
            select(Variant)
            .where(Variant.product_id == product_id, Variant.deleted_at.is_(None))
            .options(joinedload(Variant.size).joinedload(Size.size_type))
            .order_by(Variant.id.asc())
        )
        return list(db.session.execute(statement).unique().scalars())

    @classmethod
    def thumbnail_paths_for(cls, product_ids) -> dict[int, str]:
        """CE-15: the primary image, or the first active one when none is primary."""
        if not product_ids:
            return {}
        statement = (
            select(Image.product_id, Image.file_path, Image.is_primary, Image.position, Image.id)
            .where(
                Image.product_id.in_(list(product_ids)),
                Image.is_active.is_(True),
                Image.deleted_at.is_(None),
            )
            .order_by(
                Image.product_id.asc(),
                Image.is_primary.desc(),
                Image.position.asc(),
                Image.id.asc(),
            )
        )
        thumbnails: dict[int, str] = {}
        for product_id, file_path, _is_primary, _position, _id in db.session.execute(statement):
            thumbnails.setdefault(product_id, file_path)
        return thumbnails

    @classmethod
    def thumbnail_and_secondary_paths_for(cls, product_ids) -> tuple[dict[int, str], dict[int, str]]:
        """Como `thumbnail_paths_for`, pero además se queda con la segunda imagen
        de cada producto (para el hover del `ProductCard`).

        Misma consulta y mismo orden que `thumbnail_paths_for` (CE-15): no hace
        falta un join nuevo, la segunda fila de cada producto ya pasaba por acá
        y se descartaba.
        """
        if not product_ids:
            return {}, {}
        statement = (
            select(Image.product_id, Image.file_path, Image.is_primary, Image.position, Image.id)
            .where(
                Image.product_id.in_(list(product_ids)),
                Image.is_active.is_(True),
                Image.deleted_at.is_(None),
            )
            .order_by(
                Image.product_id.asc(),
                Image.is_primary.desc(),
                Image.position.asc(),
                Image.id.asc(),
            )
        )
        thumbnails: dict[int, str] = {}
        secondary: dict[int, str] = {}
        for product_id, file_path, _is_primary, _position, _id in db.session.execute(statement):
            if product_id not in thumbnails:
                thumbnails[product_id] = file_path
            elif product_id not in secondary:
                secondary[product_id] = file_path
        return thumbnails, secondary

    # ------------------------------------------------------------------
    # Dependency checks for admin classification delete (RN-68)
    # ------------------------------------------------------------------

    @classmethod
    def count_by_brand(cls, brand_id: int) -> int:
        statement = select(func.count()).where(
            Product.brand_id == brand_id,
            Product.deleted_at.is_(None),
        )
        return db.session.execute(statement).scalar_one()

    @classmethod
    def count_by_category(cls, category_id: int) -> int:
        primary = select(func.count()).where(
            Product.primary_category_id == category_id,
            Product.deleted_at.is_(None),
        )
        secondary = (
            select(func.count())
            .select_from(product_categories)
            .where(product_categories.c.category_id == category_id)
            .join(Product, Product.id == product_categories.c.product_id)
            .where(Product.deleted_at.is_(None))
        )
        return db.session.execute(primary).scalar_one() + db.session.execute(secondary).scalar_one()

    @classmethod
    def count_by_sport(cls, sport_id: int) -> int:
        statement = (
            select(func.count())
            .select_from(product_sports)
            .where(product_sports.c.sport_id == sport_id)
            .join(Product, Product.id == product_sports.c.product_id)
            .where(Product.deleted_at.is_(None))
        )
        return db.session.execute(statement).scalar_one()

    @classmethod
    def count_by_size(cls, size_id: int) -> int:
        statement = (
            select(func.count())
            .select_from(product_sizes)
            .where(product_sizes.c.size_id == size_id)
            .join(Product, Product.id == product_sizes.c.product_id)
            .where(Product.deleted_at.is_(None))
        )
        return db.session.execute(statement).scalar_one()


# Constante de módulo, no atributo de clase: `product_service` la importa
# directamente. Quedó indentada dentro de la clase al agregar métodos al final,
# lo que rompía el arranque con ImportError.
FACET_SPECS = {
    "brand": ("direct", Brand, Product.brand_id),
    "gender": ("direct", Gender, Product.gender_id),
    "category": ("association", Category, product_categories, product_categories.c.category_id),
    "sport": ("association", Sport, product_sports, product_sports.c.sport_id),
    "size": ("association", Size, product_sizes, product_sizes.c.size_id),
}
