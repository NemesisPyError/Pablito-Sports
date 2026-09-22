"""Documentos para rastreadores (05_API.md §6, `AD-09`).

§6.1: no usan la envoltura `success/data/errors/meta` ni autenticación. Lo que
se verifica aquí es lo que verá una red social al desplegar el enlace, así que
se afirma sobre el HTML tal cual sale, no sobre estructuras intermedias.
"""

import json
import re

import pytest

SLUG = "botin-nike-mercurial"


def _html(respuesta) -> str:
    assert respuesta.status_code == 200, respuesta.status_code
    return respuesta.get_data(as_text=True)


def _meta(html: str, clave: str, atributo: str = "property") -> str | None:
    """Extrae el `content` de una metaetiqueta concreta."""
    patron = rf'<meta {atributo}="{re.escape(clave)}" content="([^"]*)">'
    encontrado = re.search(patron, html)
    return encontrado.group(1) if encontrado else None


def _json_ld(html: str) -> dict | None:
    encontrado = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
    return json.loads(encontrado.group(1)) if encontrado else None


# Producto (§6.2)


def test_documento_de_producto_responde_html(catalog_client):
    respuesta = catalog_client.get(f"/_seo/products/{SLUG}")

    assert respuesta.status_code == 200
    assert respuesta.mimetype == "text/html"


def test_producto_inexistente_es_404(catalog_client):
    """§6.4."""
    assert catalog_client.get("/_seo/products/no-existe").status_code == 404


def test_producto_oculto_es_404(catalog_client):
    """`CE-13`, `CE-14`: lo que no es visible tampoco se indexa."""
    assert catalog_client.get("/_seo/products/producto-oculto").status_code == 404


def test_producto_lleva_title_y_description(catalog_client):
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))

    assert "<title>" in html
    assert "Botín Nike Mercurial" in html
    assert _meta(html, "description", atributo="name")


def test_producto_lleva_canonical_a_la_url_publica(catalog_client):
    """La canónica apunta a lo que ve la persona, no a `/_seo/*`."""
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))

    canonical = re.search(r'<link rel="canonical" href="([^"]*)">', html).group(1)
    assert canonical.endswith(f"/producto/{SLUG}")
    assert "/_seo/" not in canonical
    assert canonical.startswith("http")


def test_producto_lleva_open_graph_completo(catalog_client):
    """§6.3."""
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))

    assert _meta(html, "og:title")
    assert _meta(html, "og:description")
    assert _meta(html, "og:type") == "product"
    assert _meta(html, "og:site_name")
    assert _meta(html, "og:url").endswith(f"/producto/{SLUG}")


def test_og_image_es_absoluta(catalog_client):
    """Una `og:image` relativa la ignoran todas las redes sociales."""
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))
    imagen = _meta(html, "og:image")

    assert imagen is not None
    assert imagen.startswith("http://") or imagen.startswith("https://")


def test_producto_lleva_twitter_card(catalog_client):
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))

    # Con imagen corresponde la tarjeta grande; sin ella saldría rota.
    assert _meta(html, "twitter:card", atributo="name") == "summary_large_image"
    assert _meta(html, "twitter:title", atributo="name")


def test_producto_no_incluye_javascript(catalog_client):
    """§6.3: sin interfaz, sin estado de sesión y sin JavaScript."""
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))

    # El único `<script>` admitido es el bloque de datos estructurados.
    scripts = re.findall(r"<script([^>]*)>", html)
    assert all('type="application/ld+json"' in atributos for atributos in scripts)


# JSON-LD (06_FRONTEND.md §17.4)


def test_producto_lleva_json_ld_de_schema_org(catalog_client):
    datos = _json_ld(_html(catalog_client.get(f"/_seo/products/{SLUG}")))

    assert datos["@context"] == "https://schema.org"
    assert datos["@type"] == "Product"
    assert datos["name"] == "Botín Nike Mercurial"
    assert datos["url"].endswith(f"/producto/{SLUG}")


def test_json_ld_publica_una_oferta_en_guaranies(catalog_client):
    oferta = _json_ld(_html(catalog_client.get(f"/_seo/products/{SLUG}")))["offers"]

    assert oferta["@type"] == "Offer"
    assert oferta["priceCurrency"] == "PYG"
    # 04 §9.2: importes enteros, sin decimales.
    assert oferta["price"].isdigit()
    assert oferta["availability"].startswith("https://schema.org/")


def test_json_ld_publica_el_precio_efectivo(catalog_client):
    """`RN-30` a `RN-37`: durante una promoción rige el precio con descuento.

    Declarar el de lista mientras hay oferta prometería a Google un precio que
    la tienda no cobra.
    """
    detalle = catalog_client.get(f"/api/v1/products/{SLUG}").get_json()["data"]
    esperado = detalle["sale_price"] or detalle["list_price"]

    oferta = _json_ld(_html(catalog_client.get(f"/_seo/products/{SLUG}")))["offers"]

    assert oferta["price"] == str(esperado)


def test_json_ld_es_json_valido_y_no_rompe_el_bloque(catalog_client):
    """Un `</script>` sin escapar cerraría el bloque antes de tiempo."""
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))
    bloque = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)

    assert bloque is not None
    assert json.loads(bloque.group(1))


# Catálogo y categorías (§6.2)


def test_documento_de_catalogo(catalog_client):
    html = _html(catalog_client.get("/_seo/catalog"))

    assert _meta(html, "og:type") == "website"
    assert _meta(html, "og:url").endswith("/catalogo")


def test_el_catalogo_enlaza_fichas_para_que_se_descubran(catalog_client):
    html = _html(catalog_client.get("/_seo/catalog"))

    assert f"/producto/{SLUG}" in html


def test_documento_de_categoria(catalog_client):
    html = _html(catalog_client.get("/_seo/categories/botines"))

    assert "Botines" in html
    # La categoría no tiene ruta propia (§8.1): canonicaliza al catálogo filtrado.
    assert _meta(html, "og:url").endswith("/catalogo?category=botines")


@pytest.mark.parametrize("ruta", ["/_seo/catalog", "/_seo/categories/botines"])
def test_catalogo_y_categoria_llevan_la_imagen_de_marca(catalog_client, ruta):
    """Sin foto propia, el enlace no debe desplegarse como texto plano."""
    html = _html(catalog_client.get(ruta))

    imagen = _meta(html, "og:image")
    assert imagen is not None and imagen.startswith(("http://", "https://"))
    assert imagen.endswith("/og-default.png")
    assert _meta(html, "twitter:image", atributo="name") == imagen
    assert _meta(html, "twitter:card", atributo="name") == "summary_large_image"


def test_el_producto_conserva_su_foto_y_no_la_de_marca(catalog_client):
    html = _html(catalog_client.get(f"/_seo/products/{SLUG}"))

    assert not _meta(html, "og:image").endswith("/og-default.png")


def test_el_catalogo_publica_los_datos_de_la_tienda(catalog_client):
    """La portada llega a los rastreadores por este documento (Nginx, `location = /`)."""
    datos = _json_ld(_html(catalog_client.get("/_seo/catalog")))

    assert datos["@type"] == "SportingGoodsStore"
    assert datos["name"] == "Pablito Sports"
    assert datos["telephone"] == "+595981123456"
    assert datos["address"]["streetAddress"] == "Av. Mariscal López 1234, Asunción"
    assert datos["address"]["addressCountry"] == "PY"
    assert datos["sameAs"] == ["https://instagram.com/pablitosports"]
    assert datos["image"].endswith("/og-default.png")


def test_los_datos_de_la_tienda_no_inventan_el_horario(catalog_client):
    """`business_hours` es texto libre: `openingHours` mal formado es peor que omitirlo."""
    datos = _json_ld(_html(catalog_client.get("/_seo/catalog")))

    assert "openingHours" not in datos


def test_categoria_inexistente_es_404(catalog_client):
    assert catalog_client.get("/_seo/categories/no-existe").status_code == 404


# robots.txt y sitemap.xml


def test_robots_responde_texto_plano(catalog_client):
    respuesta = catalog_client.get("/robots.txt")

    assert respuesta.status_code == 200
    assert respuesta.mimetype == "text/plain"


def test_robots_declara_el_sitemap_en_absoluto(catalog_client):
    cuerpo = catalog_client.get("/robots.txt").get_data(as_text=True)

    linea = next(fila for fila in cuerpo.splitlines() if fila.startswith("Sitemap:"))
    assert linea.split(": ", 1)[1].startswith("http")
    assert linea.endswith("/sitemap.xml")


def test_robots_bloquea_lo_no_indexable(catalog_client):
    """06_FRONTEND.md §17.3."""
    cuerpo = catalog_client.get("/robots.txt").get_data(as_text=True)

    assert "Disallow: /carrito" in cuerpo
    assert "Disallow: /admin" in cuerpo


def test_sitemap_responde_xml(catalog_client):
    respuesta = catalog_client.get("/sitemap.xml")

    assert respuesta.status_code == 200
    assert respuesta.mimetype == "application/xml"


def test_sitemap_declara_el_espacio_de_nombres(catalog_client):
    cuerpo = catalog_client.get("/sitemap.xml").get_data(as_text=True)

    assert 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' in cuerpo
    assert cuerpo.strip().endswith("</urlset>")


def test_sitemap_incluye_portada_catalogo_y_fichas(catalog_client):
    cuerpo = catalog_client.get("/sitemap.xml").get_data(as_text=True)

    assert f"/producto/{SLUG}</loc>" in cuerpo
    assert "/catalogo</loc>" in cuerpo


def test_sitemap_incluye_categorias_marcas_y_deportes(catalog_client):
    cuerpo = catalog_client.get("/sitemap.xml").get_data(as_text=True)

    assert "category=botines" in cuerpo
    assert "brand=nike" in cuerpo
    assert "sport=futbol" in cuerpo


def test_sitemap_no_publica_productos_ocultos(catalog_client):
    """Lo que el catálogo no muestra tampoco se ofrece a indexar."""
    cuerpo = catalog_client.get("/sitemap.xml").get_data(as_text=True)

    assert "producto-oculto" not in cuerpo


def test_sitemap_usa_urls_absolutas(catalog_client):
    """Un sitemap con localizaciones relativas es inválido."""
    cuerpo = catalog_client.get("/sitemap.xml").get_data(as_text=True)

    for loc in re.findall(r"<loc>([^<]*)</loc>", cuerpo):
        assert loc.startswith("http://") or loc.startswith("https://"), loc


def test_sitemap_escapa_el_ampersand(catalog_client):
    """`&` sin escapar invalida el XML, y las rutas de filtro lo llevan."""
    cuerpo = catalog_client.get("/sitemap.xml").get_data(as_text=True)

    assert "&category=" not in cuerpo.replace("&amp;category=", "")


# Base de las URL absolutas


@pytest.mark.parametrize("ruta", ["/sitemap.xml", "/robots.txt", "/_seo/catalog"])
def test_las_urls_siguen_el_host_de_la_peticion(catalog_client, ruta):
    """Sin `SITE_BASE_URL`, el origen sale de las cabeceras que reenvía Nginx."""
    cuerpo = catalog_client.get(
        ruta, headers={"Host": "pablitosports.com", "X-Forwarded-Proto": "https"}
    ).get_data(as_text=True)

    assert "https://pablitosports.com" in cuerpo
