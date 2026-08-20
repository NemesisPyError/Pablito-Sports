"""Store settings data access (PA-10, RN-58 to RN-61)."""

from sqlalchemy import select

from ..extensions import db
from ..models import StoreSetting

SINGLETON_ID = 1


class StoreSettingRepository:
    @classmethod
    def get_singleton(cls) -> StoreSetting | None:
        """§9.2.14: the schema holds a single row, id = 1."""
        return db.session.execute(
            select(StoreSetting).where(StoreSetting.id == SINGLETON_ID)
        ).scalar_one_or_none()

    @classmethod
    def update(cls, settings: StoreSetting, **fields) -> StoreSetting:
        """Applies the given fields. The commit belongs to the service (§14.1).

        `updated_at` is not set here: §9.2.14 declares it with `onupdate`, so the
        database maintains it.
        """
        for name, value in fields.items():
            setattr(settings, name, value)
        db.session.flush()
        return settings
