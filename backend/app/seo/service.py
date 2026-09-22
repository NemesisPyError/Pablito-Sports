"""Documentos para rastreadores (05_API.md §6, `AD-09`).

Reutiliza los servicios del catálogo: la visibilidad de un producto, su precio
efectivo y su imagen principal ya están resueltos allí (`RN-20`, `RN-30` a
`RN-37`). Duplicar esas reglas aquí abriría la puerta a que el rastreador viera
un precio distinto del que ve la persona.

No conoce HTTP: devuelve estructuras, y la ruta las envuelve (BK-05).
"""

from datetime import UTC, datetime

from ..core.utils.urls import absolute_url, site_base_url
from ..repositories.brand_repository import BrandRepository
from ..repositories.category_repository import CategoryRepository
from ..repositories.product_repository import ProductRepository
from ..repositories.sport_repository import SportRepository
from ..services.product_service import ProductService
from ..services.store_setting_service import StoreSettingService

# Rutas del frontend (06_FRONTEND.md §8.1). Las canónicas apuntan a lo que ve
# la persona, no a `/_seo/*`: el documento del rastreador es una representación
# de esa página, no una página distinta.
CATALOG_PATH = "/catalogo"
PRODUCT_PATH = "/producto"

DESCRIPTION_LIMIT = 160

# Imagen de marca (1200×630) que sirve el frontend desde `public/`. Es la que
# ve una red social cuando la página no tiene una propia: la portada, el
# catálogo, una categoría o un producto sin fotos. Sin ella el enlace se
# despliega como texto plano.
DEFAULT_SHARE_IMAGE = "/og-default.png"


def _truncate(texto: str | None, maximo: int = DESCRIPTION_LIMIT) -> str:
    limpio = " ".join(str(texto or "").split())
    if len(limpio) <= maximo:
        return limpio
    return limpio[: maximo - 1].rsplit(" ", 1)[0] + "…"


def _store_settings():
    """La configuración pública, o `None` si la tienda no se inicializó."""
    try:
        return StoreSettingService.get_public()
    except Exception:
        # Un rastreador no debe recibir un 500 porque falte la configuración:
        # §6.4 sólo contempla 200 y 404.
        return None


def _store_name(ajustes=None) -> str:
    """El nombre configurado, o uno neutro si la tienda no se inicializó."""
    ajustes = ajustes or _store_settings()
    return ajustes.store_name if ajustes else "Pablito Sports"


def _share_image(imagen: str | None = None) -> str:
    """La imagen propia de la página o, si no la tiene, la de la marca."""
    return imagen or absolute_url(DEFAULT_SHARE_IMAGE)


class SeoService:
    # --- Documentos (§6.2) ------------------------------------------------

    @classmethod
    def product_document(cls, slug: str, moment: datetime | None = None) -> dict:
        """§6.2 `/_seo/products/{slug}`.

        Delega en `ProductService.get_detail_by_slug`, que ya lanza 404 cuando el
        producto no existe o no es visible (`CE-13`, `CE-14`), tal como pide §6.4.
        """
        producto = ProductService.get_detail_by_slug(slug, moment or datetime.now(UTC))
        tienda = _store_name()
        canonical = absolute_url(f"{PRODUCT_PATH}/{producto.slug}")

        # `RN-20`: la principal es la imagen de la ficha, y §10.4 la deja
        # primera en el orden.
        imagen = absolute_url(producto.images[0].image_url) if producto.images else None

        marca = producto.brand.name if producto.brand else None
        titulo = " · ".join(parte for parte in (producto.name, marca, tienda) if parte)
        descripcion = _truncate(
            producto.description or f"{producto.name}{f' de {marca}' if marca else ''} en {tienda}."
        )

        # Para compartir se cae a la imagen de marca; el dato estructurado, en
        # cambio, sólo lleva fotos reales del producto (`_product_schema`).
        compartida = _share_image(imagen)

        return {
            "title": titulo,
            "heading": producto.name,
            "description": descripcion,
            "canonical": canonical,
            "og": {
                "title": titulo,
                "description": descripcion,
                "image": compartida,
                "url": canonical,
                "type": "product",
                "site_name": tienda,
            },
            "twitter": {
                "card": "summary_large_image",
                "title": titulo,
                "description": descripcion,
                "image": compartida,
            },
            "structured_data": cls._product_schema(producto, canonical, imagen, marca),
            "links": [{"label": "Ver catálogo", "url": absolute_url(CATALOG_PATH)}],
        }

    @staticmethod
    def _product_schema(producto, canonical: str, imagen: str | None, marca: str | None) -> dict:
        """`Schema.org/Product` (06_FRONTEND.md §17.4).

        El precio publicado es el **efectivo**: `sale_price` cuando hay descuento
        vigente y `list_price` si no (`RN-30` a `RN-37`). Publicar el de lista
        durante una promoción declararía a Google un precio que la tienda no
        cobra.
        """
        precio = producto.sale_price or producto.list_price
        # 04 §9.2: los importes son enteros en guaraníes, sin decimales.
        oferta = {
            "@type": "Offer",
            "url": canonical,
            "priceCurrency": "PYG",
            "price": str(precio),
            "availability": {
                "available": "https://schema.org/InStock",
                "low_stock": "https://schema.org/LimitedAvailability",
                "out_of_stock": "https://schema.org/OutOfStock",
            }.get(producto.availability, "https://schema.org/InStock"),
        }

        schema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": producto.name,
            "url": canonical,
            "offers": oferta,
        }
        if producto.description:
            schema["description"] = producto.description
        if imagen:
            schema["image"] = [imagen]
        if marca:
            schema["brand"] = {"@type": "Brand", "name": marca}
        if producto.primary_category:
            schema["category"] = producto.primary_category.name

        return schema

    @classmethod
    def catalog_document(cls) -> dict:
        """§6.2 `/_seo/catalog`. El catálogo **limpio**, sin filtros.

        Nginx también entrega este documento a los rastreadores que piden la
        portada (`/`), de modo que es el que ve una red social al compartir el
        enlace principal de la tienda.
        """
        ajustes = _store_settings()
        tienda = _store_name(ajustes)
        canonical = absolute_url(CATALOG_PATH)
        titulo = f"Catálogo · {tienda}"
        descripcion = _truncate(
            f"Explorá el catálogo de indumentaria y calzado deportivo de {tienda}."
        )
        imagen = _share_image()

        return {
            "title": titulo,
            "heading": "Catálogo",
            "description": descripcion,
            "canonical": canonical,
            "og": {
                "title": titulo,
                "description": descripcion,
                "image": imagen,
                "url": canonical,
                "type": "website",
                "site_name": tienda,
            },
            "twitter": {
                "card": "summary_large_image",
                "title": titulo,
                "description": descripcion,
                "image": imagen,
            },
            "structured_data": cls._store_schema(tienda, ajustes, imagen),
            # Enlaces reales para que el rastreador descubra las fichas.
            "links": [
                {
                    "label": producto.name,
                    "url": absolute_url(f"{PRODUCT_PATH}/{producto.slug}"),
                }
                for producto in ProductRepository.list_visible_for_sitemap()[:50]
            ],
        }

    @classmethod
    def category_document(cls, slug: str) -> dict:
        """§6.2 `/_seo/categories/{slug}`.

        La categoría **no tiene ruta propia** en el frontend (§8.1): es un filtro
        del catálogo. La canónica apunta por tanto al catálogo filtrado por ella,
        que es la URL que una persona puede visitar.
        """
        categoria = CategoryRepository.find_active_by_slug(slug)
        if categoria is None:
            return None

        tienda = _store_name()
        canonical = absolute_url(f"{CATALOG_PATH}?category={categoria.slug}")
        titulo = f"{categoria.name} · {tienda}"
        # 04 §9.2: `categories` no tiene descripción propia; se compone una.
        descripcion = _truncate(
            f"{categoria.name} en {tienda}. Explorá el catálogo completo de la categoría."
        )
        imagen = _share_image()

        return {
            "title": titulo,
            "heading": categoria.name,
            "description": descripcion,
            "canonical": canonical,
            "og": {
                "title": titulo,
                "description": descripcion,
                "image": imagen,
                "url": canonical,
                "type": "website",
                "site_name": tienda,
            },
            "twitter": {
                "card": "summary_large_image",
                "title": titulo,
                "description": descripcion,
                "image": imagen,
            },
            "structured_data": None,
            "links": [{"label": "Ver catálogo", "url": absolute_url(CATALOG_PATH)}],
        }

    @staticmethod
    def _store_schema(tienda: str, ajustes, imagen: str) -> dict:
        """`Schema.org/SportingGoodsStore` para la portada y el catálogo.

        Sólo se emite lo que la configuración pública ya publica: nada se
        inventa ni se infiere. El horario queda fuera a propósito, porque es
        texto libre (`«Lunes a sábado: 08:00 - 18:30»`) y `openingHours`
        exige un formato estricto: declararlo mal es peor que omitirlo.
        """
        schema = {
            "@context": "https://schema.org",
            "@type": "SportingGoodsStore",
            "name": tienda,
            "url": absolute_url("/"),
            "image": imagen,
        }
        if ajustes is None:
            return schema

        if ajustes.whatsapp_number:
            schema["telephone"] = ajustes.whatsapp_number
        if ajustes.address:
            # `address` es una sola línea libre; no se intenta partirla en
            # localidad y departamento.
            schema["address"] = {
                "@type": "PostalAddress",
                "streetAddress": ajustes.address,
                "addressCountry": "PY",
            }
        redes = [
            url
            for url in (ajustes.social_links or {}).values()
            if isinstance(url, str) and url.startswith(("http://", "https://"))
        ]
        if redes:
            schema["sameAs"] = redes

        return schema

    # --- Sitemap y robots -------------------------------------------------

    @classmethod
    def sitemap_entries(cls) -> list[dict]:
        """URLs indexables del sitio (06_FRONTEND.md §17.3).

        Sólo entran las que §17.3 declara indexables: portada, catálogo y fichas.
        El catálogo filtrado por categoría, marca o deporte **no** es indexable
        —canonicaliza al catálogo desnudo—, de modo que enumerar esas
        combinaciones aquí contradiría la propia canónica y gastaría presupuesto
        de rastreo. Se incluyen igualmente como rutas de descubrimiento, con
        prioridad baja, porque son el camino real hacia las fichas.
        """
        entradas = [
            {"loc": absolute_url("/"), "changefreq": "daily", "priority": "1.0"},
            {"loc": absolute_url(CATALOG_PATH), "changefreq": "daily", "priority": "0.9"},
        ]

        for producto in ProductRepository.list_visible_for_sitemap():
            entradas.append(
                {
                    "loc": absolute_url(f"{PRODUCT_PATH}/{producto.slug}"),
                    "lastmod": (
                        producto.updated_at.date().isoformat() if producto.updated_at else None
                    ),
                    "changefreq": "weekly",
                    "priority": "0.8",
                }
            )

        # Categorías, marcas y deportes: rutas de descubrimiento del catálogo.
        for parametro, repositorio in (
            ("category", CategoryRepository),
            ("brand", BrandRepository),
            ("sport", SportRepository),
        ):
            for fila in repositorio.list_active():
                entradas.append(
                    {
                        "loc": absolute_url(f"{CATALOG_PATH}?{parametro}={fila.slug}"),
                        "changefreq": "weekly",
                        "priority": "0.5",
                    }
                )

        return entradas

    @classmethod
    def robots_txt(cls) -> str:
        """`robots.txt` con el sitemap declarado.

        Refleja la indexabilidad de 06_FRONTEND.md §17.3. El sitemap se declara
        en absoluto, que es lo que exige el estándar.
        """
        base = site_base_url()
        return "\n".join(
            [
                "# Pablito Sports — 06_FRONTEND.md §17.3",
                "",
                "User-agent: *",
                "Allow: /",
                "",
                "# §17.3: no indexables.",
                "Disallow: /carrito",
                "Disallow: /admin",
                "",
                "# Documentos para rastreadores: se sirven por negociación de",
                "# agente, no se rastrean directamente (AD-09).",
                "Disallow: /_seo/",
                "",
                f"Sitemap: {base}/sitemap.xml",
                "",
            ]
        )
