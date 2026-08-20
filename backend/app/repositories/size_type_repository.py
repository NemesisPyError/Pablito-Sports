"""Size type data access (RN-15, S-07). Seed data, read only."""

from ..models import SizeType
from .base import ActiveSlugRepository


class SizeTypeRepository(ActiveSlugRepository):
    model = SizeType
