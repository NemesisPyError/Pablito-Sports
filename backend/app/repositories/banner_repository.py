"""Banner data access (RN-73, RN-74)."""

from datetime import datetime

from sqlalchemy import or_, select

from ..extensions import db
from ..models import Banner


class BannerRepository:
    @classmethod
    def list_active_within(cls, moment: datetime, placement: str | None = None) -> list[Banner]:
        """Active and in force at `moment`, ordered by position (§7.2, CE-17, CE-18).

        `placement` acota la zona de la portada (§7.2, v1.1.0). Sin él se
        devuelven todas, que es el comportamiento anterior al parámetro: quien
        ya consumía el endpoint no cambia de resultado.
        """
        statement = select(Banner).where(
            Banner.is_active.is_(True),
            Banner.deleted_at.is_(None),
            or_(Banner.starts_at.is_(None), Banner.starts_at <= moment),
            or_(Banner.ends_at.is_(None), Banner.ends_at > moment),
        )
        if placement is not None:
            statement = statement.where(Banner.placement == placement)

        statement = statement.order_by(Banner.position.asc(), Banner.id.asc())
        return list(db.session.execute(statement).scalars())
