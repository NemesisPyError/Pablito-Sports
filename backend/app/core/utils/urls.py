"""Public URLs for stored files (05_API.md §4.9).

The stored `file_path` never reaches the client: it is turned into the public URL
that Nginx serves straight from the persistent volume (AD-04, AD-05).
"""

from flask import current_app, request

DEFAULT_UPLOADS_URL_PREFIX = "/uploads"


def public_file_url(file_path: str | None) -> str | None:
    """Turns a stored path into the URL the browser can request."""
    if not file_path:
        return None
    prefix = current_app.config.get("UPLOADS_URL_PREFIX", DEFAULT_UPLOADS_URL_PREFIX)
    return f"{prefix.rstrip('/')}/{file_path.lstrip('/')}"


def site_base_url() -> str:
    """Origin of the public site, without a trailing slash.

    Open Graph and sitemaps require absolute URLs: a relative `og:image` is
    ignored by every social crawler, and a sitemap with relative locations is
    invalid.

    `SITE_BASE_URL` wins when configured, because behind un CDN o un dominio
    propio las cabeceras de la petición pueden no llevar el origen canónico
    (por ejemplo, Cloudflare sirviendo un dominio distinto del `Host` interno).

    En su ausencia, el origen se reconstruye de `request.scheme` y
    `request.host`, que **ProxyFix** ya deja correctos a partir de
    `X-Forwarded-Proto`/`X-Forwarded-Host` de los proxies de confianza
    (03_SEGURIDAD.md §14.2). Antes se leían los encabezados crudos porque no
    había ProxyFix; ahora la fuente es la petición ya normalizada, de modo que
    detrás de TLS el enlace compartido lleva `https://`.
    """
    configured = current_app.config.get("SITE_BASE_URL")
    if configured:
        return configured.rstrip("/")

    return f"{request.scheme}://{request.host}"


def absolute_url(path: str | None) -> str | None:
    """Absolutises a site-relative path. Already absolute URLs pass through."""
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        return path
    return f"{site_base_url()}/{path.lstrip('/')}"
