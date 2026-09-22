"""Acceso a datos de banners para el panel (04_BASE_DATOS.md §9.2.12).

Distinto de `BannerRepository`, que sirve al catálogo público y solo devuelve
los activos y vigentes (`RN-73`, `RN-74`). El panel necesita verlos todos:
inactivos, futuros y vencidos incluidos.

`AD-18`: no existe borrado físico.
"""

from datetime import UTC, datetime

from sqlalchemy import func, select

from ..extensions import db
from ..models import Banner


class AdminBannerRepository:
    @classmethod
    def count_live_with_path(cls, image_path: str, *, excluding_id: int) -> int:
        """Cuántos banners VIVOS distintos de `excluding_id` usan ese archivo.

        Las rutas llevan la huella del contenido, así que subir dos veces la
        misma imagen a dos banners produce **la misma ruta**. Borrar el archivo
        al retirar uno dejaría al otro apuntando al vacío. El espacio `banners/`
        es exclusivo de esta tabla, de modo que contar aquí es suficiente.
        """
        statement = (
            select(func.count())
            .select_from(Banner)
            .where(
                Banner.image_path == image_path,
                Banner.id != excluding_id,
                Banner.deleted_at.is_(None),
            )
        )
        return db.session.execute(statement).scalar_one()

    @classmethod
    def list_all(
        cls, *, offset: int = 0, limit: int | None = None, placement: str | None = None
    ) -> list[Banner]:
        """`RN-73`: el orden de aparición es propio del banner.

        Se ordena por `position` también en el panel para que lo que se ve
        editando coincida con lo que verá el visitante. `id` desempata: nada
        impide dos banners en la misma posición.

        `placement` permite administrar las tres zonas por separado sin crear
        tres pantallas distintas (§9.11, v1.1.0).
        """
        statement = cls._base(placement).order_by(Banner.position.asc(), Banner.id.asc())
        if limit is not None:
            statement = statement.offset(offset).limit(limit)
        return list(db.session.execute(statement).scalars())

    @classmethod
    def count_all(cls, *, placement: str | None = None) -> int:
        return db.session.execute(
            select(db.func.count()).select_from(cls._base(placement).subquery())
        ).scalar_one()

    @classmethod
    def _base(cls, placement: str | None):
        statement = select(Banner).where(Banner.deleted_at.is_(None))
        if placement is not None:
            statement = statement.where(Banner.placement == placement)
        return statement

    @classmethod
    def find_by_id(cls, banner_id: int) -> Banner | None:
        return db.session.execute(
            select(Banner).where(Banner.id == banner_id, Banner.deleted_at.is_(None))
        ).scalar_one_or_none()

    @classmethod
    def create(cls, **fields) -> Banner:
        banner = Banner(**fields)
        db.session.add(banner)
        db.session.flush()
        return banner

    @classmethod
    def update(cls, banner: Banner, **fields) -> Banner:
        for key, value in fields.items():
            setattr(banner, key, value)
        db.session.flush()
        return banner

    @classmethod
    def soft_delete(cls, banner: Banner) -> Banner:
        """`AD-18`: la fila permanece, marcada."""
        banner.is_active = False
        banner.deleted_at = datetime.now(UTC)
        db.session.flush()
        return banner
