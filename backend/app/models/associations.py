"""N:M relation tables (04_BASE_DATOS.md §9.2.17).

Composite primary key, no surrogate id and no timestamps: they carry no attribute
of their own.
"""

from sqlalchemy import Column, ForeignKey, Integer, Table

from ..extensions import db

# RN-03: a product belongs to several categories; the primary one lives in
# products.primary_category_id (RN-04).
product_categories = Table(
    "product_categories",
    db.metadata,
    Column(
        "product_id",
        Integer,
        ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
    Column(
        "category_id",
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
)

# RN-08
product_sports = Table(
    "product_sports",
    db.metadata,
    Column(
        "product_id",
        Integer,
        ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
    Column(
        "sport_id",
        Integer,
        ForeignKey("sports.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
)

# RN-14
product_sizes = Table(
    "product_sizes",
    db.metadata,
    Column(
        "product_id",
        Integer,
        ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
    Column(
        "size_id",
        Integer,
        ForeignKey("sizes.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
)
