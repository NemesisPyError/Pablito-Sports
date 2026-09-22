"""Acceso a datos del collage de marca (04_BASE_DATOS.md §9.2.18).

Calco de las imágenes de producto (§9.2.10): mismas operaciones, mismo borrado
lógico. `AD-18`: no existe borrado físico de filas de negocio.
"""

from datetime import UTC, datetime

from sqlalchemy import func, select

from ..extensions import db
from ..models import Brand, BrandImage


class AdminBrandImageRepository:
    @classmethod
    def count_live_references_to_path(cls, file_path: str, *, excluding_image_id: int) -> int:
        """Referencias vivas a ese archivo, **en las dos tablas**.

        `save_brand_image()` guarda con el mismo espacio y grupo
        (`brands/<brand_id>/`) tanto el logotipo de la marca —`Brand.image_path`—
        como las piezas del collage —`BrandImage.file_path`—. Si las dos
        comparten contenido, comparten huella y por tanto **la misma ruta**:
        contar sólo el collage borraría el archivo del logotipo. Es el único
        espacio del proyecto con dos tablas dueñas, y por eso el recuento cruza.
        """
        piezas = (
            select(func.count())
            .select_from(BrandImage)
            .where(
                BrandImage.file_path == file_path,
                BrandImage.id != excluding_image_id,
                BrandImage.deleted_at.is_(None),
            )
        )
        logotipos = (
            select(func.count())
            .select_from(Brand)
            .where(Brand.image_path == file_path, Brand.deleted_at.is_(None))
        )
        return db.session.execute(piezas).scalar_one() + db.session.execute(logotipos).scalar_one()

    @classmethod
    def count_live_references_to_brand_logo(cls, file_path: str, *, excluding_brand_id: int) -> int:
        """El recíproco: al reemplazar el logotipo, ¿lo usa alguien más?"""
        piezas = (
            select(func.count())
            .select_from(BrandImage)
            .where(BrandImage.file_path == file_path, BrandImage.deleted_at.is_(None))
        )
        logotipos = (
            select(func.count())
            .select_from(Brand)
            .where(
                Brand.image_path == file_path,
                Brand.id != excluding_brand_id,
                Brand.deleted_at.is_(None),
            )
        )
        return db.session.execute(piezas).scalar_one() + db.session.execute(logotipos).scalar_one()

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
