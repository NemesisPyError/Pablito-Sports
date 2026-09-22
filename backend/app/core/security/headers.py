"""Request-dependent security headers (10_BACKEND.md §11, order 2).

The static headers of 03_SEGURIDAD.md §12 — HSTS, X-Frame-Options,
X-Content-Type-Options, Referrer-Policy, Permissions-Policy and the CSP — are
configured in Nginx. This middleware only complements what depends on the
request.

**Por qué este módulo ya no emite las tres estáticas (S-10).** Hasta S-09 este
`after_request` hacía `setdefault` de `X-Content-Type-Options`, `X-Frame-Options`
y `Referrer-Policy` «por defensa en profundidad». `setdefault` solo desduplica
dentro de la respuesta de Flask: Nginx las añade **después**, y `add_header` suma
en vez de reemplazar. Medido en producción-equivalente: llegaban con `n=2`.

La regla que resuelve el reparto, y que explica por qué `Cache-Control` sí se
queda acá:

  · cabecera **constante** para toda respuesta -> la emite el borde (Nginx), en
    un solo sitio, y así cubre también lo que Flask nunca ve (estáticos, errores
    generados por el propio Nginx);
  · cabecera que **depende de la ruta** -> la emite la aplicación, que es la
    única que conoce la semántica del endpoint.

`Cache-Control` es del segundo tipo (admin / pública / sonda / rastreo son
valores distintos); las tres estáticas son del primero. Esto además es lo que
`10_BACKEND.md` §11 ya prescribía: «los headers estáticos se configuran
preferentemente en Nginx; el middleware solo complementa lo que dependa del
request».

**Cache-Control: quién lo emite (S-09).** El reparto es por origen de la
respuesta, no por tipo de contenido:

  · lo que Nginx **proxya** hasta Flask -> lo emite ESTE módulo;
  · lo que Nginx sirve **desde disco** (index.html, /assets/, /fonts/,
    /uploads/) -> lo emite Nginx.

Los dos conjuntos son disjuntos, así que ninguna respuesta lleva la cabecera dos
veces. No es casualidad ni hace falta comprobarlo a mano: `nginx/security_headers`
no contiene `Cache-Control`, y las únicas localizaciones de Nginx que lo declaran
sirven archivos, nunca el upstream. Medido con `curl` en producción-equivalente:
`n=1` en todas las rutas de la API.

Si alguna vez hiciera falta fijar la caché de una ruta proxyada desde Nginx, la
directiva es `expires`, **no** `add_header`: `add_header` se suma a lo que envía
Flask y produce dos cabeceras, mientras que `expires` reemplaza (comprobado).
"""

from flask import Flask

# BK-06 / 10_BACKEND.md §15.1: no application cache; JSON is never stored.
_PUBLIC_API_CACHE_CONTROL = "no-store, no-cache, must-revalidate"

# §14: la respuesta trae inventario, ventas, usuarios o datos de panel. `no-store`
# prohíbe almacenarla a cualquier caché (RFC 9111 §5.2.2.5); `private` cubre
# además al intermediario que ignore `no-store` pero respete el alcance.
_PRIVATE_API_CACHE_CONTROL = "no-store, private"

# Sonda operativa (12_DEPLOY.md §10). Un `{"status":"ok"}` guardado es peor que
# no tener sonda: taparía una caída real mientras la caché siga fresca.
_HEALTH_CACHE_CONTROL = "no-store"

# robots.txt, sitemap.xml y los documentos de §6.2: públicos por definición y
# consumidos por rastreadores. Cinco minutos absorben una ráfaga de rastreo sin
# retrasar de forma apreciable un cambio de catálogo. Explícito a propósito: sin
# `Cache-Control` una caché aplica frescura heurística (RFC 9111 §4.2.2), que es
# comportamiento indefinido y no elegido.
_CRAWLER_CACHE_CONTROL = "public, max-age=300"

# Por prefijo, en orden: el primero que case gana. `/api/v1/admin` va antes que
# `/api/v1` porque es más específico.
_CACHE_CONTROL_BY_PREFIX = (
    ("/api/v1/admin", _PRIVATE_API_CACHE_CONTROL),
    ("/api/v1", _PUBLIC_API_CACHE_CONTROL),
    ("/health/", _HEALTH_CACHE_CONTROL),
    ("/_seo/", _CRAWLER_CACHE_CONTROL),
)

# Rutas exactas fuera de todo blueprint con prefijo.
_CACHE_CONTROL_BY_PATH = {
    "/robots.txt": _CRAWLER_CACHE_CONTROL,
    "/sitemap.xml": _CRAWLER_CACHE_CONTROL,
}


def _cache_control_for(path: str) -> str | None:
    """Valor de `Cache-Control` que corresponde a la ruta, o `None`."""
    exacto = _CACHE_CONTROL_BY_PATH.get(path)
    if exacto is not None:
        return exacto

    for prefijo, valor in _CACHE_CONTROL_BY_PREFIX:
        if path.startswith(prefijo):
            return valor
    return None


def init_app(app: Flask) -> None:
    """Registers the response header middleware."""

    @app.after_request
    def _apply_security_headers(response):
        from flask import request

        cache_control = _cache_control_for(request.path)
        if cache_control is not None:
            response.headers.setdefault("Cache-Control", cache_control)

        return response
