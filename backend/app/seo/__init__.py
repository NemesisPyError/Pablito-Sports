"""HTML endpoints for crawlers (AD-09, 05_API.md §6).

Lives outside /api/v1/ because it is not part of the JSON API contract
(correction M-01 of 10_BACKEND.md).

`seo_bp` serves the documents under /_seo/; `crawler_bp` serves /robots.txt and
/sitemap.xml, which search engines expect at the site root.
"""

from .views import crawler_bp, seo_bp

__all__ = ["seo_bp", "crawler_bp"]
