"""Brand data access (RN-05, RN-06)."""

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..extensions import db
from ..models import Brand, BrandImage
from .base import ActiveSlugRepository


class BrandRepository(ActiveSlugRepository):
    model = Brand

    @classmethod
    def list_home_showcases(cls) -> list[Brand]:
        """§7.2c: marcas con bloque propio en la portada.

        `home_position` no nulo es lo que distingue una marca destacada de una
        marca del catálogo (04 §9.2.3). No se pagina: es un conjunto curado por
        el administrador, no un listado.

        Las piezas del collage se traen con `selectinload` para evitar una
        consulta por marca (AD-35). El filtrado de piezas visibles queda en
        `visible_images`, porque una carga ansiosa no puede aplicar el mismo
        criterio de visibilidad sin condicionar la relación.
        """
        statement = (
            cls._visible()
            .where(Brand.home_position.isnot(None))
            .options(selectinload(Brand.images))
            .order_by(Brand.home_position.asc(), Brand.id.asc())
        )
        return list(db.session.execute(statement).scalars())

    @staticmethod
    def visible_images(brand: Brand) -> list[BrandImage]:
        """Piezas publicables del collage, en su orden (04 §9.2.18).

        Misma definición de visibilidad que el resto del catálogo:
        `is_active = TRUE AND deleted_at IS NULL` (§13.2).
        """
        return sorted(
            (image for image in brand.images if image.is_active and image.deleted_at is None),
            key=lambda image: (image.position, image.id),
        )

    @classmethod
    def list_active_images(cls, brand_id: int) -> list[BrandImage]:
        """Piezas de una marca concreta, para el panel y el detalle."""
        statement = (
            select(BrandImage)
            .where(BrandImage.brand_id == brand_id, BrandImage.deleted_at.is_(None))
            .order_by(BrandImage.position.asc(), BrandImage.id.asc())
        )
        return list(db.session.execute(statement).scalars())
