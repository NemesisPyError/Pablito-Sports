"""Lecturas administrativas de datos semilla (05_API.md §9.17, §9.18).

`S-06` y `S-07` declaran sexos y tipos de talle **datos semilla no
administrables**: aquí no hay alta, edición ni baja, y no debe haberlas.

Existen como recurso administrativo por una razón concreta: `ProductCreateDTO`
exige `gender_id` y `size_type_id`, y §9.9 exige `size_type_id` para crear un
talle. La API pública (§7.10, §7.11) los publica sin identificador porque
`AD-12` lo prohíbe; §4.8 lo admite en la privada. Sin estas lecturas el panel no
puede componer ninguno de esos dos altas.
"""

from ..core.utils.pagination import Page, PageRequest
from ..mappers.admin_mappers import gender_to_admin_dto, size_type_to_admin_dto
from ..repositories.gender_repository import GenderRepository
from ..repositories.size_type_repository import SizeTypeRepository


class AdminSeedDataService:
    """Solo lectura. No expone escrituras a propósito (`S-06`, `S-07`)."""

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
    def list_genders(cls, page_request: PageRequest) -> Page:
        """§9.17."""
        return cls._paginate(GenderRepository, gender_to_admin_dto, page_request)

    @classmethod
    def list_size_types(cls, page_request: PageRequest) -> Page:
        """§9.18."""
        return cls._paginate(SizeTypeRepository, size_type_to_admin_dto, page_request)
