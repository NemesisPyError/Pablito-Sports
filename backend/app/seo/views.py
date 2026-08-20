"""Rutas para rastreadores (05_API.md §6, `AD-09`).

§6.1: **no son parte de la API JSON**. No usan la envoltura
`success/data/errors/meta` ni autenticación, y §6.4 les exime del límite de tasa.

Nginx deriva aquí según el agente de usuario; las personas siguen recibiendo la
aplicación React (`AD-01`, supersesión parcial).
"""

from xml.sax.saxutils import escape as xml_escape

from flask import Blueprint, Response

from ..core.exceptions import NotFoundError
from .html import render_document
from .service import SeoService

SITEMAP_NS = "http://www.sitemaps.org/schemas/sitemap/0.9"

seo_bp = Blueprint("seo", __name__, url_prefix="/_seo")

# `sitemap.xml` y `robots.txt` viven en la raíz porque es donde los buscadores
# los esperan: fuera del prefijo `/_seo`, en su propio blueprint.
crawler_bp = Blueprint("crawler", __name__)


def _html(documento: dict, status: int = 200) -> Response:
    return Response(render_document(documento), status=status, mimetype="text/html")


@seo_bp.get("/products/<slug>")
def product_document(slug: str):
    """§6.2. `200` si existe y es visible; `404` si no (§6.4)."""
    # `ProductService` ya lanza `NotFoundError` para el oculto o eliminado
    # (`CE-13`, `CE-14`), y el manejador global lo convierte en 404.
    return _html(SeoService.product_document(slug))


@seo_bp.get("/categories/<slug>")
def category_document(slug: str):
    """§6.2."""
    documento = SeoService.category_document(slug)
    if documento is None:
        raise NotFoundError("category not found or not visible", resource="category")
    return _html(documento)


@seo_bp.get("/catalog")
def catalog_document():
    """§6.2. El catálogo limpio, sin filtros."""
    return _html(SeoService.catalog_document())


@crawler_bp.get("/robots.txt")
def robots_txt():
    return Response(SeoService.robots_txt(), mimetype="text/plain")


@crawler_bp.get("/sitemap.xml")
def sitemap_xml():
    """Sitemap con las URL indexables (06_FRONTEND.md §17.3)."""
    filas = ["<?xml version='1.0' encoding='UTF-8'?>", '<urlset xmlns="' + SITEMAP_NS + '">']

    for entrada in SeoService.sitemap_entries():
        filas.append("  <url>")
        filas.append(f"    <loc>{xml_escape(entrada['loc'])}</loc>")
        if entrada.get("lastmod"):
            filas.append(f"    <lastmod>{entrada['lastmod']}</lastmod>")
        if entrada.get("changefreq"):
            filas.append(f"    <changefreq>{entrada['changefreq']}</changefreq>")
        if entrada.get("priority"):
            filas.append(f"    <priority>{entrada['priority']}</priority>")
        filas.append("  </url>")

    filas.append("</urlset>")
    # `application/xml` y no `text/xml`: es lo que Search Console espera.
    return Response("\n".join(filas) + "\n", mimetype="application/xml")
