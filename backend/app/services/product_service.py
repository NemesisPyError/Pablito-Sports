"""Product and catalog rules (RN-01 to RN-48).

This is where the effective price, visibility and facets are decided. The service
returns DTOs ready to be wrapped by the route (BK-05) and never touches HTTP.
"""

from datetime import UTC, datetime

from ..core.exceptions import NotFoundError
from ..core.utils.pagination import Page, PageRequest, clamp_per_page
from ..dtos.common_dtos import FacetItemDTO
from ..dtos.product_dtos import ProductDetailDTO
from ..mappers.product_mappers import product_to_detail_dto, product_to_list_item_dto
from ..repositories.brand_repository import BrandRepository
from ..repositories.category_repository import CategoryRepository
from ..repositories.gender_repository import GenderRepository
from ..repositories.product_repository import FACET_SPECS, ProductQuery, ProductRepository
from ..repositories.size_repository import SizeRepository
from ..repositories.sport_repository import SportRepository
from ..schemas.product_schemas import ProductListQuery
from .store_setting_service import StoreSettingService


class ProductService:
    # ------------------------------------------------------------------
    # Pricing (RN-30 to RN-37)
    # ------------------------------------------------------------------

    @staticmethod
    def _discount_percentage(list_price: int, effective_price: int) -> int | None:
        """RN-35: the shown percentage is rounded down."""
        if effective_price >= list_price or list_price <= 0:
            return None
        return int((list_price - effective_price) * 100 // list_price)

    @classmethod
    def _price_fields(cls, list_price: int, effective_price: int) -> tuple[int | None, int | None]:
        """`sale_price` is only published while a discount is actually in force."""
        if effective_price >= list_price:
            return None, None
        return effective_price, cls._discount_percentage(list_price, effective_price)

    # ------------------------------------------------------------------
    # Catalog listing
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_slugs(query: ProductListQuery) -> ProductQuery:
        """Turns public slugs into internal ids (AD-23).

        A slug that matches nothing yields an empty id list, which makes the
        filter exclude everything: an unknown filter value returns no results
        rather than silently listing the whole catalog.
        """
        slugs = query.slugs
        return ProductQuery(
            search=query.search,
            brand_ids=BrandRepository.list_active_ids_by_slugs(slugs.get("brand")),
            # AD-29: a parent category brings its descendants along.
            category_ids=CategoryRepository.list_active_ids_with_descendants(slugs.get("category")),
            gender_ids=GenderRepository.list_active_ids_by_slugs(slugs.get("gender")),
            sport_ids=SportRepository.list_active_ids_by_slugs(slugs.get("sport")),
            size_ids=SizeRepository.list_active_ids_by_slugs(slugs.get("size")),
            min_price=query.min_price,
            max_price=query.max_price,
            on_sale=query.on_sale,
            is_new=query.is_new,
            is_featured=query.is_featured,
            sort=query.sort,
        )

    @staticmethod
    def _requested_but_unmatched(query: ProductListQuery, resolved: ProductQuery) -> bool:
        """True when a filter was asked for but no active row carries that slug."""
        pairs = (
            ("brand", resolved.brand_ids),
            ("category", resolved.category_ids),
            ("gender", resolved.gender_ids),
            ("sport", resolved.sport_ids),
            ("size", resolved.size_ids),
        )
        return any(query.slugs.get(name) and not ids for name, ids in pairs)

    @staticmethod
    def _page_request(query: ProductListQuery) -> PageRequest:
        """Tamaño de página efectivo (§4.4).

        El listado de destacados **sin `per_page` explícito** usa
        `store_settings.featured_products_count`: es el ajuste que el panel
        ofrece para la portada (`RF-35`), y sin esto la portada prometía un
        número que nadie respetaba.

        Sólo aplica a ese caso. Cualquier otro listado, y también el de
        destacados cuando el cliente pide un tamaño concreto, conserva el
        comportamiento de §4.4.
        """
        if not query.is_featured or query.per_page_provided:
            return query.page

        # §4.4: el máximo se sigue respetando aunque el ajuste sea mayor.
        configurado = clamp_per_page(StoreSettingService.featured_products_count())
        return PageRequest(page=query.page.page, per_page=configurado)

    @classmethod
    def list_catalog(cls, query: ProductListQuery, moment: datetime | None = None) -> Page:
        """§7.3: paginated list of active products plus facets in `meta`."""
        now = moment or datetime.now(UTC)
        resolved = cls._resolve_slugs(query)
        page_request = cls._page_request(query)

        if cls._requested_but_unmatched(query, resolved):
            return Page(items=[], page=page_request.page, per_page=page_request.per_page, total=0)

        total = ProductRepository.count(resolved, now)
        rows = ProductRepository.list_catalog(
            resolved, now, offset=page_request.offset, limit=page_request.limit
        )

        return Page(
            items=cls._build_list_items(rows),
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @classmethod
    def list_home_new(cls, moment: datetime | None = None) -> list:
        """§7.2d: Novedades es lo que el administrador sumó a mano, en su orden.

        Sin paginar: es la misma vidriera curada que `list_brand_showcases`,
        no un listado que el cliente recorre página por página.
        """
        now = moment or datetime.now(UTC)
        rows = ProductRepository.list_home_new_showcases(now)
        return cls._build_list_items(rows)

    @classmethod
    def _build_list_items(cls, rows: list[tuple]) -> list:
        """De filas `(product, effective_price)` a `ProductListItemDTO`.

        Compartido por el listado paginado y por Novedades: ambos arman la
        misma tarjeta pública y necesitan las mismas consultas en lote de
        miniaturas y talles con stock (sin esto, N productos serían N+1
        consultas en vez de dos).
        """
        product_ids = [product.id for product, _ in rows]
        thumbnails, secondary_thumbnails = ProductRepository.thumbnail_and_secondary_paths_for(
            product_ids
        )
        available_sizes = ProductRepository.available_sizes_for(product_ids)

        items = []
        for product, effective_price in rows:
            sale_price, discount = cls._price_fields(product.list_price, effective_price)
            items.append(
                product_to_list_item_dto(
                    product,
                    sale_price=sale_price,
                    discount_percentage=discount,
                    thumbnail_path=thumbnails.get(product.id),
                    secondary_thumbnail_path=secondary_thumbnails.get(product.id),
                    available_sizes=available_sizes.get(product.id),
                )
            )
        return items

    @classmethod
    def facets(cls, query: ProductListQuery, moment: datetime | None = None) -> dict:
        """RN-47: which filter options still yield at least one active product.

        Counted over the current selection, as 02_ARQUITECTURA.md §11.6 states.
        """
        now = moment or datetime.now(UTC)
        resolved = cls._resolve_slugs(query)

        if cls._requested_but_unmatched(query, resolved):
            return {name: [] for name in FACET_SPECS}

        matching_ids = ProductRepository.matching_ids(resolved, now)

        facets: dict[str, list[dict]] = {}
        for name, spec in FACET_SPECS.items():
            if spec[0] == "direct":
                _, model, column = spec
                rows = ProductRepository.facet_by_direct_column(model, column, matching_ids)
            else:
                _, model, association, model_fk = spec
                rows = ProductRepository.facet_by_association(
                    model, association, model_fk, matching_ids
                )
            facets[name] = [
                FacetItemDTO(slug=slug, name=entity_name, count=count).to_dict()
                for slug, entity_name, count in rows
            ]
        return facets

    # ------------------------------------------------------------------
    # Detail
    # ------------------------------------------------------------------

    @classmethod
    def get_detail_by_slug(cls, slug: str, moment: datetime | None = None) -> ProductDetailDTO:
        """§7.4: 404 when the product does not exist or is not visible (CE-13, CE-14)."""
        now = moment or datetime.now(UTC)
        product = ProductRepository.find_visible_by_slug(slug)
        if product is None:
            raise NotFoundError("product not found or not visible", resource="product")

        effective_price = ProductRepository.effective_price_for(product.id, now)
        sale_price, discount = cls._price_fields(product.list_price, effective_price)

        return product_to_detail_dto(
            product,
            sale_price=sale_price,
            discount_percentage=discount,
            categories=cls._visible(product.categories),
            sports=cls._visible(product.sports),
            genders=cls._visible(product.genders),
            sizes=cls._visible(product.sizes),
            images=ProductRepository.list_active_images(product.id),
            variants=ProductRepository.list_live_variants(product.id),
        )

    @staticmethod
    def _visible(rows):
        """05.1 §6.6: an inactive or deleted classification is not published."""
        return [row for row in rows if row.is_active and row.deleted_at is None]
