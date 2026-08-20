"""Datos de prueba para el entorno local.

NO es una migración: `04_BASE_DATOS.md` §11.3 y `PA-10` prohíben sembrar datos
comerciales (marcas, categorías, deportes, talles) desde una migración, porque
son del negocio y no deben congelarse en código.

Este script existe solo para ejercitar la API en `local` y en las verificaciones
manuales. Es idempotente: si detecta datos, no hace nada.

Uso:
    docker compose exec backend python ../scripts/seed_dev_data.py
    docker compose exec backend python ../scripts/seed_dev_data.py --reset
"""

import io
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, "/app")

from PIL import Image as PILImage  # noqa: E402
from werkzeug.datastructures import FileStorage  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.infrastructure.storage.local_storage import LocalStorage  # noqa: E402
from app.models import (  # noqa: E402
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

NOW = datetime.now(timezone.utc)


# Orden de borrado de las tablas comerciales. **Es un orden, no una lista**: todas
# las FK del esquema son `ON DELETE RESTRICT` (04_BASE_DATOS.md §9), así que cada
# tabla debe vaciarse antes que aquella a la que apunta.
#
# `price_history` va antes que `products` porque `RN-70` la ata al producto con
# `RESTRICT`: sin ella el reset falla en cuanto existe un cambio de precio.
#
# `audit_logs` **no se incluye a propósito**: `AD-20` la declara inmutable y solo
# referencia a `administrators`, que este reset no toca. Su `entity_id` es un
# entero sin FK, de modo que sobrevive al vaciado sin quedar colgando.
RESET_TABLES = (
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
    # `brand_images` apunta a `brands` con `RESTRICT` (04 §9.2.18): sin vaciarla
    # antes, el reset falla en cuanto una marca tenga collage cargado.
    "brand_images",
    "brands",
    "store_settings",
)


def _reset():
    for table in RESET_TABLES:
        db.session.execute(db.text(f"DELETE FROM {table}"))
    db.session.commit()


def _store_placeholder_image(product_id: int, name: str, position: int) -> str:
    """Genera una imagen sintética y la guarda por el pipeline de producción.

    Pasa por `LocalStorage.save`, así que produce original y los tres derivados
    de 02_ARQUITECTURA.md §15.5. Antes se inventaban rutas
    `products/<slug>-N.webp` que no correspondían a ningún archivo: el catálogo
    local referenciaba imágenes inexistentes.
    """
    palette = [(214, 69, 65), (33, 118, 174), (76, 161, 84), (240, 173, 78), (108, 92, 168)]
    color = palette[(sum(name.encode()) + position) % len(palette)]

    buffer = io.BytesIO()
    PILImage.new("RGB", (1200, 1200), color=color).save(buffer, format="PNG")
    buffer.seek(0)

    upload = FileStorage(stream=buffer, filename=f"seed-{position}.png", content_type="image/png")
    return LocalStorage().save(upload, product_id=product_id)


def seed():
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
            message_template="Hola! Quiero consultar por estos productos:\n{items}",
            item_template="- {name} ({variant}) x{quantity}",
            featured_products_count=8,
        )
    )

    nike = Brand(name="Nike", slug="nike")
    adidas = Brand(name="Adidas", slug="adidas")
    puma = Brand(name="Puma", slug="puma")
    # Sin `image_path`, a propósito: sin logotipo cargado, `MediaTile` y
    # `BrandShowcase` componen el nombre tipográficamente (`UDS-09`). Cargar
    # los isotipos reales es una decisión de negocio que hace el administrador
    # desde el panel, no algo que este script de datos de prueba deba asumir.
    new_balance = Brand(name="New Balance", slug="new-balance")
    reebok = Brand(name="Reebok", slug="reebok")
    under_armour = Brand(name="Under Armour", slug="under-armour")
    converse = Brand(name="Converse", slug="converse")
    fila = Brand(name="Fila", slug="fila")
    inactive_brand = Brand(name="Marca Oculta", slug="marca-oculta", is_active=False)

    calzado = Category(name="Calzado", slug="calzado")
    indumentaria = Category(name="Indumentaria", slug="indumentaria")

    futbol = Sport(name="Fútbol", slug="futbol")
    running = Sport(name="Running", slug="running")

    db.session.add_all(
        [
            nike, adidas, puma, new_balance, reebok, under_armour, converse, fila, inactive_brand,
            calzado, indumentaria, futbol, running,
        ]
    )
    db.session.flush()

    botines = Category(name="Botines", slug="botines", parent_id=calzado.id)
    zapatillas = Category(name="Zapatillas", slug="zapatillas", parent_id=calzado.id)
    remeras = Category(name="Remeras", slug="remeras", parent_id=indumentaria.id)
    db.session.add_all([botines, zapatillas, remeras])

    # Calzado (botines, zapatillas): numérico 34 a 45, el rango que pisa el
    # negocio. `talles_calzado` queda indexado por número para que el catálogo
    # de productos de abajo pueda tomar cualquiera del rango por nombre.
    talles_calzado = {
        numero: Size(name=str(numero), slug=str(numero), size_type_id=footwear.id)
        for numero in range(34, 46)
    }
    db.session.add_all(talles_calzado.values())
    talle_40, talle_42, talle_44 = talles_calzado[40], talles_calzado[42], talles_calzado[44]

    talle_m = Size(name="M", slug="m", size_type_id=apparel.id)
    talle_l = Size(name="L", slug="l", size_type_id=apparel.id)
    db.session.add_all([talle_m, talle_l])

    db.session.add_all(
        [
            Banner(title="Nueva temporada", subtitle="Hasta 30% off", image_path="banners/1.webp", position=0),
            Banner(title="Vencido", position=1, starts_at=NOW - timedelta(days=10), ends_at=NOW - timedelta(days=1)),
            Banner(title="Desactivado", position=2, is_active=False),
        ]
    )
    db.session.flush()

    catalog = [
        # (name, slug, sku, brand, primary_cat, cats, sports, gender, size_type,
        #  price, sale_price, sale_days, sizes, featured, new, availability, active)
        ("Botín Nike Mercurial", "botin-nike-mercurial", "SKU-001", nike, botines, [calzado, botines], [futbol], men, footwear, 650000, 585000, 30, [talles_calzado[38], talle_40, talle_42, talles_calzado[45]], True, False, "available", True),
        ("Botín Adidas Predator", "botin-adidas-predator", "SKU-002", adidas, botines, [calzado, botines], [futbol], men, footwear, 720000, None, None, [talles_calzado[34], talle_42, talle_44], False, True, "low_stock", True),
        ("Zapatilla Nike Air", "zapatilla-nike-air", "SKU-003", nike, zapatillas, [calzado, zapatillas], [running], women, footwear, 890000, None, None, [talle_40], True, True, "available", True),
        ("Zapatilla Puma Run", "zapatilla-puma-run", "SKU-004", puma, zapatillas, [calzado, zapatillas], [running], men, footwear, 450000, 500000, None, [talle_42], False, False, "out_of_stock", True),
        ("Remera Adidas Training", "remera-adidas-training", "SKU-005", adidas, remeras, [indumentaria, remeras], [running], women, apparel, 220000, None, None, [talle_m, talle_l], False, False, "available", True),
        ("Zapatilla New Balance 574", "zapatilla-new-balance-574", "SKU-007", new_balance, zapatillas, [calzado, zapatillas], [running], men, footwear, 610000, None, None, [talle_40, talle_42], True, False, "available", True),
        ("Botín Reebok Club", "botin-reebok-club", "SKU-008", reebok, botines, [calzado, botines], [futbol], men, footwear, 480000, 430000, 15, [talle_42, talle_44], False, False, "available", True),
        ("Remera Under Armour Tech", "remera-under-armour-tech", "SKU-009", under_armour, remeras, [indumentaria, remeras], [running], men, apparel, 190000, None, None, [talle_m, talle_l], False, True, "available", True),
        ("Zapatilla Converse Chuck Taylor", "zapatilla-converse-chuck-taylor", "SKU-010", converse, zapatillas, [calzado, zapatillas], [], women, footwear, 380000, None, None, [talle_40], True, False, "available", True),
        ("Remera Fila Classic", "remera-fila-classic", "SKU-011", fila, remeras, [indumentaria, remeras], [], women, apparel, 165000, None, None, [talle_m], False, False, "low_stock", True),
        ("Producto Oculto", "producto-oculto", "SKU-006", nike, botines, [botines], [futbol], men, footwear, 300000, None, None, [talle_40], False, False, "available", False),
    ]

    for (
        name, slug, sku, brand, primary_cat, cats, sports, gender, size_type,
        price, sale_price, sale_days, sizes, featured, new, availability, active,
    ) in catalog:
        product = Product(
            name=name,
            slug=slug,
            sku=sku,
            description=f"Descripción de {name}.",
            list_price=price,
            sale_price=sale_price if sale_price and sale_price < price else None,
            sale_starts_at=NOW - timedelta(days=1) if sale_days else None,
            sale_ends_at=NOW + timedelta(days=sale_days) if sale_days else None,
            availability=availability,
            is_featured=featured,
            is_new=new,
            is_active=active,
            brand_id=brand.id,
            primary_category_id=primary_cat.id,
            gender_id=gender.id,
            size_type_id=size_type.id,
        )
        product.categories = cats
        product.sports = sports
        product.sizes = sizes
        db.session.add(product)
        db.session.flush()

        # Las imágenes pasan por el pipeline real (02_ARQUITECTURA.md §15.4):
        # original en su rama, tres derivados en la suya. Antes se inventaban
        # rutas `products/<slug>-N.webp` que no correspondían a ningún archivo,
        # de modo que el catálogo local referenciaba imágenes inexistentes.
        for position in (0, 1):
            file_path = _store_placeholder_image(product.id, name, position)
            db.session.add(
                Image(
                    product_id=product.id,
                    file_path=file_path,
                    is_primary=position == 0,
                    position=position,
                    alt_text=name if position == 0 else None,
                )
            )

        for size in sizes:
            db.session.add(Variant(product_id=product.id, size_id=size.id))

    # Promoción vigente por marca: alcanza a todos los productos Puma (RN-36).
    db.session.add(
        Promotion(
            name="Puma 20%",
            discount_percentage=20,
            starts_at=NOW - timedelta(days=1),
            ends_at=NOW + timedelta(days=30),
            brand_id=puma.id,
        )
    )
    # Promoción expirada: no debe afectar ningún precio (RN-32).
    db.session.add(
        Promotion(
            name="Adidas expirada",
            discount_percentage=50,
            starts_at=NOW - timedelta(days=30),
            ends_at=NOW - timedelta(days=2),
            brand_id=adidas.id,
        )
    )

    db.session.commit()


def main():
    app = create_app()
    with app.app_context():
        if "--reset" in sys.argv:
            _reset()
        if db.session.query(Product).count():
            print("Ya hay productos cargados. Use --reset para regenerar.")
            return
        seed()
        print(
            f"OK  productos={db.session.query(Product).count()} "
            f"marcas={db.session.query(Brand).count()} "
            f"categorias={db.session.query(Category).count()} "
            f"promociones={db.session.query(Promotion).count()}"
        )


if __name__ == "__main__":
    main()
