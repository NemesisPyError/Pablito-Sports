#!/usr/bin/env python
"""Reconstruye los datos de negocio a partir de `audit_logs`.

Herramienta de recuperación puntual, escrita el 10/09/2026 después de que un
`seed_dev_data.py --reset` vaciara las tablas de negocio del entorno de
desarrollo. **No forma parte del producto**: no la llama nadie, no corre en
despliegue y se puede borrar cuando la recuperación esté cerrada.

Por qué funciona: `AD-20` declara `audit_logs` inmutable y sin FK a las tablas
de negocio, así que el vaciado no la toca. Cada alta y cada edición dejaron una
foto completa de la fila (`_audit_snapshot`), de modo que el último estado de
cada entidad es reconstruible.

    python /scripts/restore_from_audit.py            # informe, no escribe nada
    python /scripts/restore_from_audit.py --apply    # escribe

Límites conocidos, por diseño de `PRODUCT_AUDIT_FIELDS`:

  · la **descripción** del producto no se audita y no se puede recuperar;
  · tampoco `sale_starts_at` / `sale_ends_at` (sí `sale_price`);
  · las relaciones N:M del producto —categorías adicionales, deportes, sexos y
    talles— no están en la foto y hay que rehacerlas desde el panel.
"""

import argparse
import json
import os
import sys
from collections import defaultdict

sys.path.insert(0, "/app")

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402

# Momento del `--reset`. Todo lo anterior es el estado real de la tienda; lo
# posterior son los datos de ejemplo del seed y las pruebas de esa tarde.
CUTOFF = "2026-09-10 12:29:00+00"

# El reset recreó `sizes` con identificadores nuevos, así que los `size_id` de
# las variantes quedaron colgando. La tanda del seed es determinista y del mismo
# largo —14 talles en el mismo orden—, de modo que el desplazamiento es
# constante. **No se da por bueno**: `_validar_talles` comprueba que el tipo de
# talle del producto coincida con el del talle mapeado, variante por variante.
SIZE_OFFSET = 36

# Mismo caso con las categorías del seed —Calzado, Indumentaria, Botines,
# Zapatillas, Remeras—, que nunca pasaron por el panel y por eso no tienen
# auditoría: sus identificadores viejos 13..17 son los actuales 55..59. El
# desplazamiento se comprobó contra los nombres de los productos que las usan
# («Botín Nike Mercurial» -> Botines, «Zapatilla Puma Run» -> Zapatillas,
# «Remera Adidas Training» -> Remeras, «Adidas F50» -> Botines), cinco
# coincidencias independientes. Las categorías que sí creó el administrador
# (46..54) vienen de la auditoría y no necesitan mapeo.
CATEGORY_OFFSET = 42
CATEGORY_SEED_RANGE = range(13, 18)

# Talle que existía y el seed no recrea: hay que darlo de alta al restaurar.
TALLE_FALTANTE = {"name": "X", "slug": "x", "size_type_id": 2}
TALLE_FALTANTE_ID_VIEJO = 47


def mapear_categoria(cid):
    return cid + CATEGORY_OFFSET if cid in CATEGORY_SEED_RANGE else cid

UPLOAD = os.environ.get("UPLOAD_FOLDER", "/var/lib/pablito/uploads")

ENTIDADES = (
    "brand",
    "category",
    "product",
    "image",
    "variant",
    "banner",
    "brand_image",
    "promotion",
    "store_settings",
)


def ultimo_estado():
    """Última foto de cada entidad viva al momento del vaciado.

    Se descarta la entidad cuya última acción fue `delete` o cuya foto trae
    `deleted_at`: el administrador ya la había borrado y restaurarla sería
    devolver a la tienda algo que había decidido sacar.
    """
    filas = db.session.execute(
        db.text(
            """
            SELECT entity_type, entity_id, action,
                   COALESCE(new_values, old_values) AS snapshot
              FROM audit_logs
             WHERE created_at < :cutoff
               AND entity_type = ANY(:tipos)
             ORDER BY entity_type, entity_id, id
            """
        ),
        {"cutoff": CUTOFF, "tipos": list(ENTIDADES)},
    ).mappings()

    # Se **fusionan** las fotos en orden en lugar de quedarse con la última: no
    # todas las acciones guardan el juego completo de campos —`activate` y
    # `deactivate` dejan fotos parciales—, así que tomar solo la última perdería
    # el precio de un producto que lo último que recibió fue una reactivación.
    # Fusionando, cada campo conserva su valor conocido más reciente.
    estado = defaultdict(dict)
    ultima_accion = {}

    for fila in filas:
        clave = (fila["entity_type"], fila["entity_id"])
        ultima_accion[clave] = fila["action"]
        if fila["snapshot"]:
            estado[clave].update(fila["snapshot"])

    vivas = defaultdict(dict)
    for (tipo, eid), foto in estado.items():
        if ultima_accion[(tipo, eid)] == "delete" or foto.get("deleted_at"):
            continue
        vivas[tipo][eid] = foto

    # `defaultdict` para que un tipo sin entidades vivas no rompa el informe.
    for tipo in ENTIDADES:
        vivas[tipo]
    return vivas


def ruta_de(file_path):
    return os.path.join(UPLOAD, "derivatives", file_path)


def sin_prefijo(url):
    """`/uploads/brands/19/x-800.jpg` -> `brands/19/x-800.jpg`."""
    return url.replace("/uploads/", "", 1) if url else None


def mapa_de_talles(crear=False):
    """Identificador viejo -> identificador actual, para cada talle.

    Si `crear`, da de alta el talle que el seed no recrea. En modo informe no
    escribe: devuelve `None` para ese talle y el informe avisa que se creará.
    """
    mapa = {viejo: viejo + SIZE_OFFSET for viejo in range(13, 27)}

    fila = db.session.execute(
        db.text("SELECT id FROM sizes WHERE slug = :slug"), {"slug": TALLE_FALTANTE["slug"]}
    ).scalar()
    if fila is None and crear:
        fila = db.session.execute(
            db.text(
                "INSERT INTO sizes (name, slug, size_type_id, is_active, created_at, updated_at)"
                " VALUES (:name, :slug, :size_type_id, TRUE, now(), now()) RETURNING id"
            ),
            TALLE_FALTANTE,
        ).scalar()
    mapa[TALLE_FALTANTE_ID_VIEJO] = fila
    return mapa


def _validar_talles(vivas, mapa):
    """Comprueba el mapeo de talles contra el tipo de talle de cada producto."""
    tipos = dict(db.session.execute(db.text("SELECT id, size_type_id FROM sizes")).all())
    tipos[None] = TALLE_FALTANTE["size_type_id"]  # el que se creará al aplicar
    problemas = []

    for variante in vivas["variant"].values():
        producto = vivas["product"].get(variante["product_id"])
        if producto is None:
            continue
        nuevo = mapa.get(variante["size_id"], -1)
        if nuevo not in tipos:
            problemas.append(f"talle {variante['size_id']} -> {nuevo}: no existe")
        elif tipos[nuevo] != producto["size_type_id"]:
            problemas.append(
                f"talle {variante['size_id']} -> {nuevo}: tipo {tipos[nuevo]} "
                f"pero el producto {variante['product_id']} es tipo {producto['size_type_id']}"
            )
    return problemas


# Sin estos campos no se puede insertar la fila: no hay valor por defecto
# razonable para el precio ni para el SKU de un producto real.
PRODUCTO_MINIMO = (
    "name",
    "slug",
    "sku",
    "list_price",
    "availability",
    "primary_category_id",
    "brand_id",
    "size_type_id",
)


def categorias_actuales():
    """Las que el vaciado NO retira: el seed las recrea y los productos las usan."""
    return {
        fila[0] for fila in db.session.execute(db.text("SELECT id FROM categories")).all()
    }


def clasificar(vivas):
    """Separa lo reconstruible de lo que no.

    Un producto puede tener auditoría y aun así no ser recuperable: los que solo
    registraron reordenamientos de imagen (`{"image_order": [...]}`) nunca
    guardaron nombre ni precio. Se listan aparte, con sus archivos, para
    recrearlos a mano — insertarlos con datos inventados sería peor.
    """
    incompletos = {}
    for pid, p in list(vivas["product"].items()):
        faltan = [c for c in PRODUCTO_MINIMO if p.get(c) is None]
        if faltan:
            incompletos[pid] = faltan
            del vivas["product"][pid]

    # Referencias que quedarían colgando: la FK las rechazaría al insertar.
    huerfanos = []
    for pid, p in list(vivas["product"].items()):
        colgando = False
        if p["brand_id"] not in vivas["brand"]:
            huerfanos.append(f"producto {pid}: marca {p['brand_id']} no recuperable")
            colgando = True
        # La categoría del seed se resuelve por desplazamiento; la del panel
        # tiene que estar entre las auditadas.
        destino = mapear_categoria(p["primary_category_id"])
        existe = destino in vivas["category"] or destino in categorias_actuales()
        if not existe:
            huerfanos.append(
                f"producto {pid}: categoría {p['primary_category_id']}"
                f" (-> {destino}) no recuperable"
            )
            colgando = True

        # Se omite en vez de bloquear: son filas de las primeras pruebas, que
        # referencian marcas y categorías de una generación de datos anterior a
        # la auditoría. Insertarlas violaría la FK.
        if colgando:
            del vivas["product"][pid]

    # Imágenes y variantes de un producto que no vuelve no pueden insertarse.
    sueltas = {"image": [], "variant": []}
    for tipo in ("image", "variant"):
        for eid, fila in list(vivas[tipo].items()):
            if fila["product_id"] not in vivas["product"]:
                sueltas[tipo].append((eid, fila))
                del vivas[tipo][eid]

    return incompletos, huerfanos, sueltas


def informe(vivas, incompletos, huerfanos, sueltas):
    print("=" * 72)
    print("INFORME DE RECONSTRUCCIÓN — no se escribe nada")
    print("=" * 72)
    print(f"Corte: {CUTOFF}\n")

    for tipo in ENTIDADES:
        print(f"  {tipo:<16} {len(vivas[tipo]):>3}")

    print("\n--- Productos ---")
    for pid, p in sorted(vivas["product"].items()):
        imagenes = [i for i in vivas["image"].values() if i["product_id"] == pid]
        variantes = [v for v in vivas["variant"].values() if v["product_id"] == pid]
        precio = f"{p['list_price']:,}".replace(",", ".")
        oferta = f" (oferta {p['sale_price']:,})".replace(",", ".") if p["sale_price"] else ""
        print(
            f"  [{pid:>3}] {p['name'][:34]:<34} Gs. {precio:>10}{oferta}"
            f"  {len(imagenes)} img  {len(variantes)} var"
        )

    if incompletos:
        print("\n--- Productos SIN datos suficientes (no se insertan) ---")
        for pid, faltan in sorted(incompletos.items()):
            print(f"  [{pid:>3}] faltan: {', '.join(faltan)}")
            for _, imagen in sueltas["image"]:
                if imagen["product_id"] == pid:
                    print(f"        archivo en disco: {imagen['file_path']}")

    if huerfanos:
        print("\n--- Referencias colgando ---")
        for h in huerfanos:
            print(f"  {h}")

    print("\n--- Archivos referenciados ---")
    faltantes = []
    total = 0
    for imagen in vivas["image"].values():
        total += 1
        if not os.path.exists(ruta_de(imagen["file_path"])):
            faltantes.append(imagen["file_path"])
    for pieza in vivas["brand_image"].values():
        total += 1
        if not os.path.exists(ruta_de(pieza["file_path"])):
            faltantes.append(pieza["file_path"])
    for banner in vivas["banner"].values():
        if banner.get("image_path"):
            total += 1
            if not os.path.exists(ruta_de(banner["image_path"])):
                faltantes.append(banner["image_path"])
    for marca in vivas["brand"].values():
        ruta = sin_prefijo(marca.get("image_url"))
        if ruta:
            total += 1
            if not os.path.exists(ruta_de(ruta)):
                faltantes.append(ruta)

    print(f"  {total - len(faltantes)} de {total} presentes en disco")
    for ruta in faltantes:
        print(f"  FALTA: {ruta}")

    print("\n--- Mapeo de talles ---")
    mapa = mapa_de_talles()
    problemas = _validar_talles(vivas, mapa)
    if problemas:
        for p in problemas:
            print(f"  PROBLEMA: {p}")
    else:
        usados = sorted({v["size_id"] for v in vivas["variant"].values()})
        print(f"  coherente para las {len(vivas['variant'])} variantes")
        print(f"  talles usados: {usados} -> {[mapa.get(u) for u in usados]}")
        if mapa.get(TALLE_FALTANTE_ID_VIEJO) is None:
            print(f"  se dará de alta el talle «{TALLE_FALTANTE['name']}», que el seed no recrea")

    print("\n--- Colisiones de identificador con lo que hay ahora ---")
    for tabla, tipo in (("brands", "brand"), ("categories", "category"), ("products", "product")):
        actuales = {
            fila[0] for fila in db.session.execute(db.text(f"SELECT id FROM {tabla}")).all()
        }
        choque = actuales & set(vivas[tipo])
        print(f"  {tabla:<12} {len(choque)} en conflicto (el vaciado previo las retira)")

    print("\n--- No recuperable ---")
    print("  · descripción de cada producto (no está en PRODUCT_AUDIT_FIELDS)")
    print("  · ventana de oferta: sale_starts_at / sale_ends_at")
    print("  · relaciones N:M: categorías adicionales, deportes, sexos y talles")
    print("=" * 72)
    return not problemas and not faltantes


# Mismo orden que `seed_dev_data.RESET_TABLES`: las hijas antes que las madres.
VACIAR = (
    "product_sizes",
    "product_sports",
    "product_categories",
    "product_genders",
    "sales",
    "variants",
    "images",
    "price_history",
    "promotions",
    "products",
    "banners",
    # `categories` NO se vacía: el seed recreó Calzado, Indumentaria, Botines,
    # Zapatillas y Remeras, que son las que usan los productos restaurados. Se
    # les suman las que el administrador creó por el panel.
    "brand_images",
    "brands",
    "store_settings",
)


def _normalizar_principales(imagenes):
    """Una sola imagen principal por producto (`uq_images_primary_per_product`).

    Al fusionar las fotos puede quedar más de una marcada: cuando el
    administrador cambió la portada, la auditoría registró la nueva principal
    pero no siempre el descenso de la anterior. Se conserva la de menor
    `position`, que es la que el panel muestra primero, y si ninguna quedó
    marcada se asciende esa misma para que el producto no se quede sin portada.
    """
    por_producto = defaultdict(list)
    for iid, imagen in imagenes.items():
        por_producto[imagen["product_id"]].append((iid, imagen))

    for grupo in por_producto.values():
        grupo.sort(key=lambda par: (par[1].get("position", 0), par[0]))
        for indice, (_, imagen) in enumerate(grupo):
            imagen["is_primary"] = indice == 0


def aplicar(vivas):
    for tabla in VACIAR:
        db.session.execute(db.text(f"DELETE FROM {tabla}"))

    for bid, b in sorted(vivas["brand"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO brands (id, name, slug, image_path, tagline, home_position,"
                " show_in_strip, is_active, created_at, updated_at)"
                " VALUES (:id, :name, :slug, :image_path, :tagline, :home_position,"
                " :show_in_strip, :is_active, now(), now())"
            ),
            {
                "id": bid,
                "name": b["name"],
                "slug": b["slug"],
                "image_path": sin_prefijo(b.get("image_url")),
                "tagline": b.get("tagline"),
                "home_position": b.get("home_position"),
                "show_in_strip": b.get("show_in_strip", True),
                "is_active": b.get("is_active", True),
            },
        )

    # Las madres primero: `parent_id` apunta dentro de la misma tabla.
    for cid, c in sorted(vivas["category"].items(), key=lambda kv: (kv[1].get("parent_id") or 0)):
        db.session.execute(
            db.text(
                "INSERT INTO categories (id, name, slug, parent_id, is_active, created_at,"
                " updated_at) VALUES (:id, :name, :slug, :parent_id, :is_active, now(), now())"
                " ON CONFLICT (id) DO NOTHING"
            ),
            {
                "id": cid,
                "name": c["name"],
                "slug": c["slug"],
                "parent_id": mapear_categoria(c["parent_id"]) if c.get("parent_id") else None,
                "is_active": c.get("is_active", True),
            },
        )
        for gid in c.get("gender_ids") or []:
            db.session.execute(
                db.text(
                    "INSERT INTO category_genders (category_id, gender_id)"
                    " VALUES (:c, :g) ON CONFLICT DO NOTHING"
                ),
                {"c": cid, "g": gid},
            )

    for pid, p in sorted(vivas["product"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO products (id, name, slug, sku, description, list_price, sale_price,"
                " availability, is_active, is_featured, is_new, home_new_position,"
                " primary_category_id, brand_id, size_type_id, created_at, updated_at)"
                " VALUES (:id, :name, :slug, :sku, NULL, :list_price, :sale_price, :availability,"
                " :is_active, :is_featured, :is_new, :home_new_position, :primary_category_id,"
                " :brand_id, :size_type_id, now(), now())"
            ),
            {
                "id": pid,
                "name": p["name"],
                "slug": p["slug"],
                "sku": p["sku"],
                "list_price": p["list_price"],
                "sale_price": p.get("sale_price"),
                "availability": p["availability"],
                "is_active": p.get("is_active", True),
                "is_featured": p.get("is_featured", False),
                "is_new": p.get("is_new", False),
                "home_new_position": p.get("home_new_position"),
                "primary_category_id": mapear_categoria(p["primary_category_id"]),
                "brand_id": p["brand_id"],
                "size_type_id": p["size_type_id"],
            },
        )
        # RN-04: la categoría principal también es una categoría del producto.
        db.session.execute(
            db.text(
                "INSERT INTO product_categories (product_id, category_id)"
                " VALUES (:p, :c) ON CONFLICT DO NOTHING"
            ),
            {"p": pid, "c": mapear_categoria(p["primary_category_id"])},
        )

    _normalizar_principales(vivas["image"])
    for iid, i in sorted(vivas["image"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO images (id, product_id, file_path, alt_text, position, is_primary,"
                " is_active, created_at, updated_at)"
                " VALUES (:id, :product_id, :file_path, :alt_text, :position, :is_primary,"
                " TRUE, now(), now())"
            ),
            {
                "id": iid,
                "product_id": i["product_id"],
                "file_path": i["file_path"],
                "alt_text": i.get("alt_text"),
                "position": i.get("position", 0),
                "is_primary": i.get("is_primary", False),
            },
        )

    mapa = mapa_de_talles(crear=True)
    for vid, v in sorted(vivas["variant"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO variants (id, product_id, size_id, quantity, created_at,"
                " updated_at) VALUES (:id, :product_id, :size_id, :quantity, now(), now())"
            ),
            {
                "id": vid,
                "product_id": v["product_id"],
                "size_id": mapa[v["size_id"]],
                "quantity": v.get("quantity", 0),
            },
        )
        # RN-14: el talle de la variante es también un talle del producto.
        db.session.execute(
            db.text(
                "INSERT INTO product_sizes (product_id, size_id)"
                " VALUES (:p, :s) ON CONFLICT DO NOTHING"
            ),
            {"p": v["product_id"], "s": mapa[v["size_id"]]},
        )

    for bid, b in sorted(vivas["banner"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO banners (id, title, subtitle, image_path, link_url, button_label,"
                " placement, position, starts_at, ends_at, is_active, created_at, updated_at)"
                " VALUES (:id, :title, :subtitle, :image_path, :link_url, :button_label,"
                " :placement, :position, :starts_at, :ends_at, :is_active, now(), now())"
            ),
            {
                "id": bid,
                "title": b.get("title"),
                "subtitle": b.get("subtitle"),
                "image_path": b.get("image_path"),
                "link_url": b.get("link_url"),
                "button_label": b.get("button_label"),
                "placement": b.get("placement", "hero"),
                "position": b.get("position", 0),
                "starts_at": b.get("starts_at"),
                "ends_at": b.get("ends_at"),
                "is_active": b.get("is_active", True),
            },
        )

    for iid, i in sorted(vivas["brand_image"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO brand_images (id, brand_id, file_path, alt_text, position, is_active,"
                " created_at, updated_at)"
                " VALUES (:id, :brand_id, :file_path, :alt_text, :position, :is_active,"
                " now(), now())"
            ),
            {
                "id": iid,
                "brand_id": i["brand_id"],
                "file_path": i["file_path"],
                "alt_text": i.get("alt_text"),
                "position": i.get("position", 0),
                "is_active": i.get("is_active", True),
            },
        )

    for pid, p in sorted(vivas["promotion"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO promotions (id, name, discount_percentage, product_id, category_id,"
                " brand_id, starts_at, ends_at, is_active, created_at, updated_at)"
                " VALUES (:id, :name, :discount_percentage, :product_id, :category_id, :brand_id,"
                " :starts_at, :ends_at, :is_active, now(), now())"
            ),
            {
                "id": pid,
                "name": p["name"],
                "discount_percentage": p["discount_percentage"],
                "product_id": p.get("product_id"),
                "category_id": p.get("category_id"),
                "brand_id": p.get("brand_id"),
                "starts_at": p.get("starts_at"),
                "ends_at": p.get("ends_at"),
                "is_active": p.get("is_active", True),
            },
        )

    for sid, s in sorted(vivas["store_settings"].items()):
        db.session.execute(
            db.text(
                "INSERT INTO store_settings (id, store_name, whatsapp_number, email, address,"
                " business_hours, social_links, message_template, item_template,"
                " featured_products_count, about_title, about_text, about_image_path,"
                " updated_at)"
                " VALUES (:id, :store_name, :whatsapp_number, :email, :address, :business_hours,"
                " CAST(:social_links AS jsonb), :message_template, :item_template,"
                " :featured_products_count, :about_title, :about_text, :about_image_path,"
                " now())"
            ),
            {
                "id": sid,
                "store_name": s["store_name"],
                "whatsapp_number": s["whatsapp_number"],
                "email": s.get("email"),
                "address": s.get("address"),
                "business_hours": s.get("business_hours"),
                "social_links": json.dumps(s.get("social_links") or {}),
                "message_template": s["message_template"],
                "item_template": s["item_template"],
                "featured_products_count": s.get("featured_products_count", 8),
                "about_title": s.get("about_title"),
                "about_text": s.get("about_text"),
                "about_image_path": s.get("about_image_path"),
            },
        )

    # RN-38b: `products.availability` **se deriva** de la suma de las
    # cantidades vivas; no es un dato que el administrador escriba. La foto de
    # auditoría la guarda igual, pero restaurarla tal cual deja el estado
    # contradiciendo al stock —un producto con 21 unidades marcado «No
    # disponible»—, así que se recalcula con la misma regla que
    # `AdminProductService._recompute_availability`.
    db.session.execute(
        db.text(
            """
            UPDATE products p
               SET availability = CASE
                     WHEN t.total > 5 THEN 'available'
                     WHEN t.total >= 1 THEN 'low_stock'
                     ELSE 'out_of_stock'
                   END
              FROM (
                    SELECT p2.id,
                           COALESCE(SUM(v.quantity) FILTER (WHERE v.deleted_at IS NULL), 0) AS total
                      FROM products p2
                      LEFT JOIN variants v ON v.product_id = p2.id
                     GROUP BY p2.id
                   ) t
             WHERE t.id = p.id
            """
        )
    )

    # Las secuencias quedaron detrás de los identificadores insertados a mano:
    # sin esto, el próximo alta desde el panel choca con una clave existente.
    for tabla in ("brands", "categories", "products", "images", "variants", "banners",
                  "brand_images", "promotions", "store_settings"):
        db.session.execute(
            db.text(
                f"SELECT setval(pg_get_serial_sequence('{tabla}', 'id'),"
                f" GREATEST((SELECT COALESCE(MAX(id), 1) FROM {tabla}), 1))"
            )
        )

    db.session.commit()
    print("Reconstrucción aplicada.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="escribe; sin esto solo informa")
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        vivas = ultimo_estado()
        incompletos, huerfanos, sueltas = clasificar(vivas)
        limpio = informe(vivas, incompletos, huerfanos, sueltas)

        if not args.apply:
            print("\nModo informe. Volvé a correrlo con --apply para escribir.")
            return

        if not limpio:
            print("\nHay problemas sin resolver arriba. No se escribe nada.")
            sys.exit(1)

        aplicar(vivas)


if __name__ == "__main__":
    main()
