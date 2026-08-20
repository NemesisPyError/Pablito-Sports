"""Column mixins shared by the schema (04_BASE_DATOS.md §9.1, §13).

Models only structure data: they hold no business logic (AD-03) and import
nothing from api, services, repositories, dtos or mappers.
"""

from sqlalchemy import Boolean, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column


class IdentityMixin:
    """Integer autoincrement primary key (AD-33)."""

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)


class TimestampMixin:
    """Creation and modification stamps, stored in UTC (AD-34)."""

    created_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped["DateTime"] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class SoftDeleteMixin:
    """Logical deletion (AD-18, RN-69). No row is ever physically removed."""

    deleted_at: Mapped["DateTime | None"] = mapped_column(DateTime(timezone=True), nullable=True)


class ActiveMixin:
    """Public visibility flag (RN-01, RN-02)."""

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
