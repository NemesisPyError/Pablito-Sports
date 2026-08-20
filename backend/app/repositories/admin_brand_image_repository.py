"""Acceso a datos del collage de marca (04_BASE_DATOS.md §9.2.18).

Calco de las imágenes de producto (§9.2.10): mismas operaciones, mismo borrado
lógico. `AD-18`: no existe borrado físico de filas de negocio.
"""

from datetime import UTC, datetime

from sqlalchemy import select

from ..extensions import db
from ..models import BrandImage


class AdminBrandImageRepository:
    @classmethod
    def list_by_brand(cls, brand_id: int) -> list[BrandImage]:
        """Todas las piezas vivas de la marca, en su orden."""
        statement = (
            select(BrandImage)
            .where(BrandImage.brand_id == brand_id, BrandImage.deleted_at.is_(None))
            .order_by(BrandImage.position.asc(), BrandImage.id.asc())
        )
        return list(db.session.execute(statement).scalars())

    @classmethod
    def count_active(cls, brand_id: int) -> int:
        """Piezas que hoy se publicarían: es el número que limita el servicio."""
        statement = select(db.func.count()).where(
            BrandImage.brand_id == brand_id,
            BrandImage.deleted_at.is_(None),
            BrandImage.is_active.is_(True),
        )
        return db.session.execute(statement).scalar_one()

    @classmethod
    def find_by_id(cls, image_id: int, brand_id: int) -> BrandImage | None:
        """Acotada a la marca: una pieza de otra marca es un 404, no un 403.

        El recurso está anidado; pedir la pieza de otra marca es pedir algo que
        en esa ruta no existe.
        """
        return db.session.execute(
            select(BrandImage).where(
                BrandImage.id == image_id,
                BrandImage.brand_id == brand_id,
                BrandImage.deleted_at.is_(None),
            )
        ).scalar_one_or_none()

    @classmethod
    def create(cls, **fields) -> BrandImage:
        image = BrandImage(**fields)
        db.session.add(image)
        db.session.flush()
        return image

    @classmethod
    def update(cls, image: BrandImage, **fields) -> BrandImage:
        for key, value in fields.items():
            setattr(image, key, value)
        db.session.flush()
        return image

    @classmethod
    def soft_delete(cls, image: BrandImage) -> BrandImage:
        image.is_active = False
        image.deleted_at = datetime.now(UTC)
        db.session.flush()
        return image
