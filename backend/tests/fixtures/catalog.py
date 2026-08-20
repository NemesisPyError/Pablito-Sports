"""Reproducible catalog fixture for contract tests (11_TESTING.md §12).

Mirrors the dataset that `scripts/seed_dev_data.py` builds for the local
environment, so a curl run and the test suite observe the same catalog.
"""

from datetime import UTC, datetime, timedelta

from app.extensions import db
from app.models import (
    Banner,
    Brand,
    Category,
    Gender,
    Image,
    Product,
    Promotion,
    Size,
    SizeType,
    Sport,
    StoreSetting,
    Variant,
)

# Orden de borrado, no simple lista: todas las FK son `ON DELETE RESTRICT`
# (04_BASE_DATOS.md §9), así que cada tabla se vacía antes que aquella a la que
# apunta. Debe coincidir con `RESET_TABLES` de `scripts/seed_dev_data.py`;
# `test_dev_reset.py` verifica ambos órdenes contra el esquema vivo.
#
# `price_history` va antes que `products` por la FK de `RN-70`. `audit_logs`
# queda fuera: `AD-20` la declara inmutable y no referencia nada que aquí se
# borre.
BUSINESS_TABLES = (
    "product_sizes",
    "product_sports",
    "product_categories",
    "sales",
    "variants",
    "images",
    "price_history",
    "promotions",
    "products",
    "banners",
    "sizes",
    "sports",
    "categories",
    # `brand_images` apunta a `brands` con `RESTRICT` (04 §9.2.18).
    "brand_images",
    "brands",
    "store_settings",
)


def clear_business_data():
    """Empties the commercial tables, leaving the seed rows untouched."""
    for table in BUSINESS_TABLES:
        db.session.execute(db.text(f"DELETE FROM {table}"))
    db.session.commit()


def build_catalog(now: datetime | None = None):
    """Creates the dataset the contract tests assert against."""
    now = now or datetime.now(UTC)

    men = db.session.query(Gender).filter_by(slug="men").one()
    women = db.session.query(Gender).filter_by(slug="women").one()
    footwear = db.session.query(SizeType).filter_by(slug="footwear_numeric").one()
    apparel = db.session.query(SizeType).filter_by(slug="apparel_alpha").one()

    db.session.add(
        StoreSetting(
            id=1,
            store_name="Pablito Sports",
            whatsapp_number="+595981123456",
            address="Av. Mariscal López 1234, Asunción",
            business_hours="Lunes a sábado de 08:00 a 19:00",
            social_links={"instagram": "https://instagram.com/pablitosports"},
            message_template="Hola! {items}",
            item_template="- {name}",
            featured_products_count=8,
        )
    )

    nike = Brand(name="Nike", slug="nike")
    adidas = Brand(name="Adidas", slug="adidas")
    puma = Brand(name="Puma", slug="puma")
    hidden_brand = Brand(name="Marca Oculta", slug="marca-oculta", is_active=False)

    calzado = Category(name="Calzado", slug="calzado")
    indumentaria = Category(name="Indumentaria", slug="indumentaria")
    futbol = Sport(name="Fútbol", slug="futbol")
    running = Sport(name="Running", slug="running")

    db.session.add_all(
        [
            nike,
            adidas,
            puma,
            hidden_brand,
            calzado,
            indumentaria,
            futbol,
            running,
        ]
    )
    db.session.flush()

    botines = Category(name="Botines", slug="botines", parent_id=calzado.id)
    zapatillas = Category(name="Zapatillas", slug="zapatillas", parent_id=calzado.id)
    remeras = Category(name="Remeras", slug="remeras", parent_id=indumentaria.id)

    size_40 = Size(name="40", slug="40", size_type_id=footwear.id)
    size_42 = Size(name="42", slug="42", size_type_id=footwear.id)
    size_44 = Size(name="44", slug="44", size_type_id=footwear.id)
    size_m = Size(name="M", slug="m", size_type_id=apparel.id)
    size_l = Size(name="L", slug="l", size_type_id=apparel.id)

    db.session.add_all([botines, zapatillas, remeras, size_40, size_42, size_44, size_m, size_l])
    db.session.add_all(
        [
            Banner(
                title="Nueva temporada",
                subtitle="Hasta 30% off",
                image_path="banners/1.webp",
                position=0,
            ),
            Banner(
                title="Vencido",
                position=1,
                starts_at=now - timedelta(days=10),
                ends_at=now - timedelta(days=1),
            ),
            Banner(title="Desactivado", position=2, is_active=False),
        ]
    )
    db.session.flush()

    rows = [
        (
            "Botín Nike Mercurial",
            "botin-nike-mercurial",
            "SKU-001",
            nike,
            botines,
            [calzado, botines],
            [futbol],
            men,
            footwear,
            650000,
            585000,
            True,
            [size_40, size_42],
            True,
            False,
            "available",
            True,
        ),
        (
            "Botín Adidas Predator",
            "botin-adidas-predator",
            "SKU-002",
            adidas,
            botines,
            [calzado, botines],
            [futbol],
            men,
            footwear,
            720000,
            None,
            False,
            [size_42, size_44],
            False,
            True,
            "low_stock",
            True,
        ),
        (
            "Zapatilla Nike Air",
            "zapatilla-nike-air",
            "SKU-003",
            nike,
            zapatillas,
            [calzado, zapatillas],
            [running],
            women,
            footwear,
            890000,
            None,
            False,
            [size_40],
            True,
            True,
            "available",
            True,
        ),
        (
            "Zapatilla Puma Run",
            "zapatilla-puma-run",
            "SKU-004",
            puma,
            zapatillas,
            [calzado, zapatillas],
            [running],
            men,
            footwear,
            450000,
            None,
            False,
            [size_42],
            False,
            False,
            "out_of_stock",
            True,
        ),
        (
            "Remera Adidas Training",
            "remera-adidas-training",
            "SKU-005",
            adidas,
            remeras,
            [indumentaria, remeras],
            [running],
            women,
            apparel,
            220000,
            None,
            False,
            [size_m, size_l],
            False,
            False,
            "available",
            True,
        ),
        (
            "Producto Oculto",
            "producto-oculto",
            "SKU-006",
            nike,
            botines,
            [botines],
            [futbol],
            men,
            footwear,
            300000,
            None,
            False,
            [size_40],
            False,
            False,
            "available",
            False,
        ),
    ]

    for (
        name,
        slug,
        sku,
        brand,
        primary_category,
        categories,
        sports,
        gender,
        size_type,
        list_price,
        sale_price,
        sale_in_force,
        sizes,
        featured,
        is_new,
        availability,
        active,
    ) in rows:
        product = Product(
            name=name,
            slug=slug,
            sku=sku,
            description=f"Descripción de {name}.",
            list_price=list_price,
            sale_price=sale_price,
            sale_starts_at=now - timedelta(days=1) if sale_in_force else None,
            sale_ends_at=now + timedelta(days=30) if sale_in_force else None,
            availability=availability,
            is_featured=featured,
            is_new=is_new,
            is_active=active,
            brand_id=brand.id,
            primary_category_id=primary_category.id,
            gender_id=gender.id,
            size_type_id=size_type.id,
        )
        product.categories = categories
        product.sports = sports
        product.sizes = sizes
        db.session.add(product)
        db.session.flush()

        db.session.add_all(
            [
                Image(
                    product_id=product.id,
                    file_path=f"products/{slug}-1.webp",
                    is_primary=True,
                    position=0,
                    alt_text=name,
                ),
                Image(product_id=product.id, file_path=f"products/{slug}-2.webp", position=1),
            ]
        )
        for size in sizes:
            db.session.add(Variant(product_id=product.id, size_id=size.id))

    # RN-36: brand-scoped promotion in force.
    db.session.add(
        Promotion(
            name="Puma 20%",
            discount_percentage=20,
            starts_at=now - timedelta(days=1),
            ends_at=now + timedelta(days=30),
            brand_id=puma.id,
        )
    )
    # RN-32: expired promotion must not change any price.
    db.session.add(
        Promotion(
            name="Adidas expirada",
            discount_percentage=50,
            starts_at=now - timedelta(days=30),
            ends_at=now - timedelta(days=2),
            brand_id=adidas.id,
        )
    )

    db.session.commit()
