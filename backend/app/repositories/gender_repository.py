"""Gender data access (RN-09, S-06). Seed data, read only."""

from ..models import Gender
from .base import ActiveSlugRepository


class GenderRepository(ActiveSlugRepository):
    model = Gender
