"""Classification reads for the public catalog (BK-02, transversal CatalogService).

Services own the business rules and assemble the output DTOs (BK-05). They know
nothing about HTTP (DEP-02): every method here could run from a script.
"""

from ..core.utils.pagination import Page, PageRequest
from ..dtos.catalog_dtos import BrandShowcaseDTO, CategoryTreeDTO
from ..mappers.catalog_mappers import (
    brand_to_dto,
    brand_to_showcase_dto,
    category_to_tree_dto,
    gender_to_dto,
    size_to_dto,
    size_type_to_dto,
    sport_to_dto,
)
from ..repositories.brand_repository import BrandRepository
from ..repositories.category_repository import CategoryRepository
from ..repositories.gender_repository import GenderRepository
from ..repositories.size_repository import SizeRepository
from ..repositories.size_type_repository import SizeTypeRepository
from ..repositories.sport_repository import SportRepository


class CatalogService:
    """Read-only listings of the classifications the catalog filters by."""

    @staticmethod
    def _paginate(repository, mapper, page_request: PageRequest) -> Page:
        total = repository.count_active()
        rows = repository.list_active(offset=page_request.offset, limit=page_request.limit)
        return Page(
            items=[mapper(row) for row in rows],
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @classmethod
    def list_brands(cls, page_request: PageRequest) -> Page:
        """§7.6: active brands in alphabetical order."""
        return cls._paginate(BrandRepository, brand_to_dto, page_request)

    @staticmethod
    def list_brand_showcases() -> list[BrandShowcaseDTO]:
        """§7.2c: marcas con bloque propio en la portada.

        Sin paginar a propósito: es una selección curada por el administrador
        mediante `home_position`, no un listado del catálogo.
        """
        return [
            brand_to_showcase_dto(brand, BrandRepository.visible_images(brand))
            for brand in BrandRepository.list_home_showcases()
        ]

    @classmethod
    def list_sports(cls, page_request: PageRequest) -> Page:
        """§7.7."""
        return cls._paginate(SportRepository, sport_to_dto, page_request)

    @classmethod
    def list_genders(cls, page_request: PageRequest) -> Page:
        """§7.10. Seed data, read only (S-06)."""
        return cls._paginate(GenderRepository, gender_to_dto, page_request)

    @classmethod
    def list_size_types(cls, page_request: PageRequest) -> Page:
        """§7.11. Seed data, read only (S-07)."""
        return cls._paginate(SizeTypeRepository, size_type_to_dto, page_request)

    @classmethod
    def list_sizes(cls, page_request: PageRequest, size_type_slug: str | None = None) -> Page:
        """§7.9: ordered by size type and then name, optionally filtered by type."""
        total = SizeRepository.count_active_by_size_type(size_type_slug)
        rows = SizeRepository.list_active_by_size_type(
            size_type_slug, offset=page_request.offset, limit=page_request.limit
        )
        return Page(
            items=[size_to_dto(row) for row in rows],
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @staticmethod
    def list_category_tree() -> list[CategoryTreeDTO]:
        """§7.5: active tree of up to two levels (AD-24)."""
        roots = CategoryRepository.list_active_roots()
        children = CategoryRepository.list_active_children([root.id for root in roots])

        by_parent: dict[int, list] = {}
        for child in children:
            by_parent.setdefault(child.parent_id, []).append(child)

        return [category_to_tree_dto(root, by_parent.get(root.id, [])) for root in roots]
