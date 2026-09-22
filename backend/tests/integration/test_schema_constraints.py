"""Schema constraints of 04_BASE_DATOS.md §9.5, verified by violating them."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.models import (
    Administrator,
    AuditLog,
    Banner,
    Brand,
    Category,
    Gender,
    Image,
    Product,
    Promotion,
    Size,
    SizeType,
    StoreSetting,
    Variant,
)

NOW = datetime(2026, 8, 9, 12, 0, tzinfo=UTC)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


def _unique(prefix: str) -> str:
    """Slugs are globally unique and never released (AD-19), so every test that
    creates rows needs its own namespace to stay independent of the others."""
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def _classification(session, suffix=""):
    """Creates the rows a product needs to exist."""
    token = _unique("t")
    brand = Brand(name=f"Nike{suffix}-{token}", slug=f"nike{suffix}-{token}")
    category = Category(name=f"Calzado{suffix}-{token}", slug=f"calzado{suffix}-{token}")
    gender = session.query(Gender).filter_by(slug="men").one()
    size_type = session.query(SizeType).filter_by(slug="footwear_numeric").one()
    session.add_all([brand, category])
    session.flush()
    return brand, category, gender, size_type


def _product(session, suffix="", **overrides):
    brand, category, gender, size_type = _classification(session, suffix)
    token = _unique("p")
    values = {
        "name": f"Zapatilla{suffix}-{token}",
        "slug": f"zapatilla{suffix}-{token}",
        "sku": f"SKU{suffix}-{token}",
        "list_price": 350000,
        "availability": "available",
        "brand_id": brand.id,
        "primary_category_id": category.id,
        "size_type_id": size_type.id,
    }
    values.update(overrides)
    product = Product(**values)
    product.genders = [gender]
    session.add(product)
    return product


# --------------------------------------------------------------------------
# Seeds (§11.3)
# --------------------------------------------------------------------------


def test_gender_seed_is_loaded(session):
    slugs = {row.slug for row in session.query(Gender).all()}
    assert slugs == {"men", "women", "unisex", "boys", "girls"}


def test_size_type_seed_is_loaded(session):
    slugs = {row.slug for row in session.query(SizeType).all()}
    assert slugs == {"footwear_numeric", "apparel_alpha", "one_size"}


def test_commercial_data_is_not_seeded_by_any_migration():
    # PA-10, §11.3: brands, categories, sports, colours and sizes belong to the
    # business and must never be frozen into a migration. Asserted against the
    # migration sources so the check does not depend on the current row counts.
    import pathlib
    import re

    sources = "\n".join(
        path.read_text(encoding="utf-8")
        for path in pathlib.Path("migrations/versions").glob("*.py")
    )
    seeded = set(re.findall(r"_seed_table\(\s*['\"](\w+)['\"]", sources))
    inserted = set(re.findall(r"INSERT\s+INTO\s+(\w+)", sources, flags=re.IGNORECASE))

    assert seeded == {"genders", "size_types"}
    assert inserted == set()


# --------------------------------------------------------------------------
# products (§9.2.1)
# --------------------------------------------------------------------------


def test_list_price_must_be_positive(session):
    # RN-27
    _product(session, list_price=0)
    with pytest.raises(IntegrityError, match="list_price_positive"):
        session.flush()


def test_sale_price_must_be_below_list_price(session):
    # RN-31
    _product(session, list_price=100000, sale_price=100000)
    with pytest.raises(IntegrityError, match="sale_price_below_list"):
        session.flush()


def test_sale_window_must_be_ordered(session):
    # RN-32, RN-33
    _product(session, sale_starts_at=NOW, sale_ends_at=NOW - timedelta(days=1))
    with pytest.raises(IntegrityError, match="sale_window_ordered"):
        session.flush()


def test_open_ended_sale_window_is_allowed(session):
    # RN-33: a NULL end date means the sale runs indefinitely.
    _product(session, list_price=100000, sale_price=80000, sale_starts_at=NOW, sale_ends_at=None)
    session.flush()


def test_availability_is_restricted_to_the_documented_values(session):
    # RN-38
    _product(session, availability="on_backorder")
    with pytest.raises(IntegrityError, match="availability_allowed"):
        session.flush()


@pytest.mark.parametrize("value", ["available", "low_stock", "out_of_stock"])
def test_documented_availability_values_are_accepted(session, value):
    _product(session, suffix=value.replace("_", ""), availability=value)
    session.flush()


def test_coming_soon_is_no_longer_a_valid_availability(session):
    # RN-38b (v1.4.0): se retira "coming_soon" del dominio de valores.
    _product(session, availability="coming_soon")
    with pytest.raises(IntegrityError, match="availability_allowed"):
        session.flush()


def test_variant_quantity_cannot_be_negative(session):
    # RN-38b: `quantity` es la fuente de verdad del stock, nunca negativa.
    product = _product(session, availability="available")
    session.flush()

    session.add(Variant(product_id=product.id, quantity=-1))
    with pytest.raises(IntegrityError, match="variants_quantity_non_negative"):
        session.flush()


# --------------------------------------------------------------------------
# Slug uniqueness across deleted rows (AD-19, RN-79)
# --------------------------------------------------------------------------


def test_slug_is_not_reusable_after_soft_delete(session):
    # AD-19: the slug is never released, not even once the row is deleted.
    product = _product(session, "-a")
    session.flush()
    product.deleted_at = NOW
    session.flush()

    session.add(
        Product(
            name="Otro",
            slug=product.slug,
            sku=_unique("SKU"),
            list_price=1000,
            availability="available",
            brand_id=product.brand_id,
            primary_category_id=product.primary_category_id,
            size_type_id=product.size_type_id,
        )
    )
    with pytest.raises(IntegrityError, match="slug"):
        session.flush()


def test_sku_is_unique(session):
    # RN-11
    product = _product(session, "-a")
    session.flush()
    session.add(
        Product(
            name="Otro",
            slug=_unique("otro-slug"),
            sku=product.sku,
            list_price=1000,
            availability="available",
            brand_id=product.brand_id,
            primary_category_id=product.primary_category_id,
            size_type_id=product.size_type_id,
        )
    )
    with pytest.raises(IntegrityError, match="sku"):
        session.flush()


def test_brand_slug_is_not_reusable_after_soft_delete(session):
    slug = _unique("adidas")
    brand = Brand(name=slug, slug=slug)
    session.add(brand)
    session.flush()
    brand.deleted_at = NOW
    session.flush()

    session.add(Brand(name=f"{slug}-2", slug=slug))
    with pytest.raises(IntegrityError, match="slug"):
        session.flush()


# --------------------------------------------------------------------------
# variants (§9.2.2, AD-15)
# --------------------------------------------------------------------------


def test_variant_size_is_unique_per_product(session):
    product = _product(session, "-v")
    size_type = session.query(SizeType).filter_by(slug="footwear_numeric").one()
    size = Size(name=_unique("42"), slug=_unique("42"), size_type_id=size_type.id)
    session.add(size)
    session.flush()

    session.add(Variant(product_id=product.id, size_id=size.id))
    session.flush()
    session.add(Variant(product_id=product.id, size_id=size.id))
    with pytest.raises(IntegrityError, match="uq_variants_product_size"):
        session.flush()


def test_variant_combination_can_be_recreated_after_soft_delete(session):
    # AD-15: reconciliation restores a combination that was logically removed.
    product = _product(session, "-w")
    size_type = session.query(SizeType).filter_by(slug="footwear_numeric").one()
    size = Size(name=_unique("43"), slug=_unique("43"), size_type_id=size_type.id)
    session.add(size)
    session.flush()

    variant = Variant(product_id=product.id, size_id=size.id)
    session.add(variant)
    session.flush()
    variant.deleted_at = NOW
    session.flush()

    session.add(Variant(product_id=product.id, size_id=size.id))
    session.flush()


def test_variant_without_size_is_unique_too(session):
    # COALESCE makes the NULL case comparable.
    product = _product(session, "-x")
    session.flush()
    session.add(Variant(product_id=product.id, size_id=None))
    session.flush()
    session.add(Variant(product_id=product.id, size_id=None))
    with pytest.raises(IntegrityError, match="uq_variants_product_size"):
        session.flush()


# --------------------------------------------------------------------------
# images (§9.2.10, RN-20)
# --------------------------------------------------------------------------


def test_only_one_primary_image_per_product(session):
    product = _product(session, "-i")
    session.flush()
    session.add(Image(product_id=product.id, file_path="/a.webp", is_primary=True))
    session.flush()
    session.add(Image(product_id=product.id, file_path="/b.webp", is_primary=True))
    with pytest.raises(IntegrityError, match="uq_images_primary_per_product"):
        session.flush()


def test_primary_image_can_be_replaced_after_soft_delete(session):
    product = _product(session, "-j")
    session.flush()
    first = Image(product_id=product.id, file_path="/a.webp", is_primary=True)
    session.add(first)
    session.flush()
    first.deleted_at = NOW
    session.flush()

    session.add(Image(product_id=product.id, file_path="/b.webp", is_primary=True))
    session.flush()


def test_image_position_cannot_be_negative(session):
    product = _product(session, "-k")
    session.flush()
    session.add(Image(product_id=product.id, file_path="/a.webp", position=-1))
    with pytest.raises(IntegrityError, match="position_non_negative"):
        session.flush()


# --------------------------------------------------------------------------
# promotions (§9.2.11, RN-36)
# --------------------------------------------------------------------------


def test_promotion_without_scope_means_all_products(session):
    # RN-36 (v1.6.0): sin ninguno de los tres campos, la promoción aplica a
    # todos los productos — ya no es un estado rechazado.
    session.add(Promotion(name="Sin alcance", discount_percentage=10, starts_at=NOW))
    session.flush()


def test_promotion_cannot_have_two_scopes(session):
    product = _product(session, "-p")
    session.flush()
    session.add(
        Promotion(
            name="Dos alcances",
            discount_percentage=10,
            starts_at=NOW,
            product_id=product.id,
            brand_id=product.brand_id,
        )
    )
    with pytest.raises(IntegrityError, match="scope_exclusive"):
        session.flush()


def test_promotion_with_a_single_scope_is_accepted(session):
    product = _product(session, "-q")
    session.flush()
    session.add(
        Promotion(
            name="Solo producto", discount_percentage=10, starts_at=NOW, product_id=product.id
        )
    )
    session.flush()


@pytest.mark.parametrize("percentage", [0, 100, -5])
def test_discount_percentage_must_be_between_1_and_99(session, percentage):
    product = _product(session, f"-d{abs(percentage)}")
    session.flush()
    session.add(
        Promotion(
            name="Fuera de rango",
            discount_percentage=percentage,
            starts_at=NOW,
            product_id=product.id,
        )
    )
    with pytest.raises(IntegrityError, match="discount_percentage_range"):
        session.flush()


# --------------------------------------------------------------------------
# categories, banners, administrators, audit_logs, store_settings
# --------------------------------------------------------------------------


def test_category_cannot_be_its_own_parent(session):
    category = Category(name=_unique("Calzado"), slug=_unique("calzado"))
    session.add(category)
    session.flush()
    category.parent_id = category.id
    with pytest.raises(IntegrityError, match="parent_not_self"):
        session.flush()


def test_banner_window_must_be_ordered(session):
    session.add(Banner(title="Oferta", starts_at=NOW, ends_at=NOW - timedelta(hours=1)))
    with pytest.raises(IntegrityError, match="window_ordered"):
        session.flush()


def test_administrator_role_is_restricted(session):
    # RN-66, RN-67
    session.add(
        Administrator(
            username=_unique("x"), email=f"{_unique('x')}@e.com", password_hash="h", role="owner"
        )
    )
    with pytest.raises(IntegrityError, match="role_allowed"):
        session.flush()


@pytest.mark.parametrize("role", ["administrator", "super_administrator"])
def test_documented_roles_are_accepted(session, role):
    session.add(
        Administrator(
            username=_unique(role), email=f"{_unique(role)}@e.com", password_hash="h", role=role
        )
    )
    session.flush()


def test_audit_action_is_restricted(session):
    # AD-20
    admin = Administrator(
        username=_unique("a"),
        email=f"{_unique('a')}@e.com",
        password_hash="h",
        role="administrator",
    )
    session.add(admin)
    session.flush()
    session.add(
        AuditLog(administrator_id=admin.id, action="purge", entity_type="products", entity_id=1)
    )
    with pytest.raises(IntegrityError, match="action_allowed"):
        session.flush()


def test_featured_products_count_must_be_positive(session):
    session.add(
        StoreSetting(
            store_name="Pablito Sports",
            whatsapp_number="+595...",
            message_template="{items}",
            item_template="{name}",
            featured_products_count=0,
        )
    )
    with pytest.raises(IntegrityError, match="featured_products_count_positive"):
        session.flush()


def test_size_name_is_unique_within_its_size_type(session):
    size_type = session.query(SizeType).filter_by(slug="apparel_alpha").one()
    name = _unique("M")
    session.add(Size(name=name, slug=_unique("m"), size_type_id=size_type.id))
    session.flush()
    session.add(Size(name=name, slug=_unique("m2"), size_type_id=size_type.id))
    with pytest.raises(IntegrityError, match="uq_sizes_name_size_type_id"):
        session.flush()


# --------------------------------------------------------------------------
# Referential integrity (§9.8)
# --------------------------------------------------------------------------


def test_foreign_keys_restrict_physical_deletion(session):
    # AD-18 forbids physical deletes; RESTRICT is the database-level backstop.
    product = _product(session, "-fk")
    session.flush()
    with pytest.raises(IntegrityError, match="fk_products_brand_id_brands"):
        session.execute(text("DELETE FROM brands WHERE id = :id"), {"id": product.brand_id})


def test_product_requires_every_mandatory_foreign_key(session):
    session.add(
        Product(
            name="Sin marca",
            slug="sin-marca",
            sku="SKU-NM",
            list_price=1000,
            availability="available",
        )
    )
    with pytest.raises(IntegrityError):
        session.flush()
