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

# RN-09 (v2.9.0): un producto puede pertenecer a varios sexos.
product_genders = Table(
    "product_genders",
    db.metadata,
    Column(
        "product_id",
        Integer,
        ForeignKey("products.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
    Column(
        "gender_id",
        Integer,
        ForeignKey("genders.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
)

# RN-83 (v2.10.0): la categoría declara a qué sexos aplica, para que el menú de
# la tienda no tenga que ofrecer el árbol completo bajo Hombres, Mujeres e
# Infantil a la vez. Sin filas, la categoría no tiene restricción y aparece en
# todos los ejes (`AD-41`): es como se comportaba antes de existir esta tabla.
category_genders = Table(
    "category_genders",
    db.metadata,
    Column(
        "category_id",
        Integer,
        ForeignKey("categories.id", ondelete="RESTRICT", onupdate="CASCADE"),
        primary_key=True,
    ),
    Column(
        "gender_id",
        Integer,
        ForeignKey("genders.id", ondelete="RESTRICT", onupdate="CASCADE"),
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
