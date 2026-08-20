"""Sport data access (RN-08)."""

from ..models import Sport
from .base import ActiveSlugRepository


class SportRepository(ActiveSlugRepository):
    model = Sport
