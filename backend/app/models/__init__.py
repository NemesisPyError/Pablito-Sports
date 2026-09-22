"""SQLAlchemy models of the approved schema (04_BASE_DATOS.md §6).

Importing this package registers every table in the metadata, which is what
Alembic autogenerate compares against the live database.

17 entities plus 3 N:M relation tables.
"""

from .administration import (
    AUDIT_ACTION_VALUES,
    ROLE_VALUES,
    Administrator,
    AuditLog,
    PriceHistory,
    Sale,
    SaleOrder,
    StoreSetting,
)
from .associations import (
    category_genders,
    product_categories,
    product_genders,
    product_sizes,
    product_sports,
)
from .bank import Bank
from .classification import Brand, BrandImage, Category, Gender, Size, SizeType, Sport
from .product import AVAILABILITY_VALUES, Image, Product, Variant
from .promotion import (
    BANNER_PLACEMENT_VALUES,
    DEFAULT_BANNER_PLACEMENT,
    Banner,
    Promotion,
)

__all__ = [
    # Catalog
    "Product",
    "Variant",
    "Image",
    "Brand",
    "BrandImage",
    "Category",
    "Sport",
    "Gender",
    "Size",
    "SizeType",
    "Promotion",
    "Banner",
    "Bank",
    # Panel
    "Administrator",
    "StoreSetting",
    "PriceHistory",
    "Sale",
    "SaleOrder",
    "AuditLog",
    # N:M relation tables
    "category_genders",
    "product_categories",
    "product_genders",
    "product_sports",
    "product_sizes",
    # Closed value sets
    "AVAILABILITY_VALUES",
    "ROLE_VALUES",
    "AUDIT_ACTION_VALUES",
    "BANNER_PLACEMENT_VALUES",
    "DEFAULT_BANNER_PLACEMENT",
]
