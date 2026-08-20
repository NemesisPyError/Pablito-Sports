"""Shared output structures (05_API.md §10.1, §10.7).

DTOs are plain data: they know nothing about SQLAlchemy and hold no business
logic (AD-12, 10_BACKEND.md §8.7).
"""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class BaseDTO:
    """Common serialisation for every output DTO."""

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class NamedEntityDTO(BaseDTO):
    """The public identity of a classification: slug plus display name (AD-23)."""

    slug: str
    name: str


@dataclass(frozen=True)
class FacetItemDTO(BaseDTO):
    """One still-selectable filter option and how many products it yields (RN-47)."""

    slug: str
    name: str
    count: int
