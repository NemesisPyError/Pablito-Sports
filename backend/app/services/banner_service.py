"""Banner rules (RN-73, RN-74)."""

from datetime import UTC, datetime

from ..dtos.catalog_dtos import BannerDTO
from ..mappers.catalog_mappers import banner_to_dto
from ..models import BANNER_PLACEMENT_VALUES
from ..repositories.banner_repository import BannerRepository


class BannerService:
    @staticmethod
    def list_public(
        moment: datetime | None = None, placement: str | None = None
    ) -> list[BannerDTO]:
        """§7.2: active and in-force banners, ordered by position.

        RN-34 evaluates validity against the store's clock; timestamps are stored
        as absolute instants (AD-34), so comparing in UTC is equivalent.

        `placement` acota la zona de la portada. Un valor fuera del conjunto se
        **ignora** y se devuelven todas, conforme a `AD-26` y §4.6: en una
        lectura, el peor caso de un valor desconocido es un listado más amplio.
        La escritura sí lo rechaza (§9.11), porque ahí guardar en la zona
        equivocada no tiene vuelta atrás.
        """
        now = moment or datetime.now(UTC)
        zona = placement if placement in BANNER_PLACEMENT_VALUES else None
        return [banner_to_dto(banner) for banner in BannerRepository.list_active_within(now, zona)]
