"""Política de `Cache-Control` de las respuestas que emite Flask (S-09).

Lo que estos tests fijan no es «la cabecera existe», sino **la clasificación**:
cada familia de rutas pertenece a una clase de caché distinta y confundirlas
tiene consecuencias concretas.

  · `/api/v1/admin/*` trae stock, ventas, usuarios y datos de panel. Si una
    caché compartida la guarda, la respuesta de un administrador puede
    entregársele a otra persona.
  · `/health/*` es una sonda operativa: un `{"status":"ok"}` guardado tapa una
    caída real mientras siga fresco.
  · `robots.txt`, `sitemap.xml` y los documentos de §6.2 son públicos por
    definición; lo que se corrige acá es que **no llevaban ninguna cabecera** y
    quedaban a merced de la frescura heurística (RFC 9111 §4.2.2), que es
    comportamiento no elegido.

El reparto con Nginx está en el propio módulo: Flask emite la cabecera de todo
lo que Nginx proxya, Nginx la de lo que sirve desde disco. Los conjuntos son
disjuntos, y por eso ninguna respuesta sale con dos `Cache-Control`.
"""

import pytest

from app.core.security.headers import (
    _CRAWLER_CACHE_CONTROL,
    _HEALTH_CACHE_CONTROL,
    _PRIVATE_API_CACHE_CONTROL,
    _PUBLIC_API_CACHE_CONTROL,
)


def _cache_control(respuesta):
    """La cabecera y **cuántas veces** aparece: la duplicación es el defecto."""
    valores = respuesta.headers.getlist("Cache-Control")
    return (valores[0] if valores else None), len(valores)


# ---------------------------------------------------------------------------
# Nunca dos veces
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "ruta",
    [
        "/api/v1/brands",
        "/api/v1/admin/products",
        "/health/live",
        "/robots.txt",
        "/sitemap.xml",
        "/_seo/catalog",
    ],
)
def test_cache_control_sale_una_sola_vez(client, ruta):
    """`add_header` de Nginx SUMA en vez de reemplazar.

    Si alguna vez se declarara `Cache-Control` en una localización proxyada de
    Nginx, la respuesta saldría con dos. Acá se fija la mitad que Flask
    controla: exactamente una.
    """
    _, cantidad = _cache_control(client.get(ruta))
    assert cantidad == 1, f"{ruta} devolvió {cantidad} cabeceras Cache-Control"


# ---------------------------------------------------------------------------
# Autenticado / administrativo: jamás en una caché compartida
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "ruta",
    ["/api/v1/admin/products", "/api/v1/admin/dashboard", "/api/v1/admin/users"],
)
def test_la_api_administrativa_no_es_almacenable(client, ruta):
    valor, _ = _cache_control(client.get(ruta))

    assert valor == _PRIVATE_API_CACHE_CONTROL
    # `no-store` prohíbe almacenar a cualquier caché (RFC 9111 §5.2.2.5);
    # `private` cubre además al intermediario que lo ignore pero respete el
    # alcance.
    assert "no-store" in valor
    assert "private" in valor
    assert "public" not in valor


def test_ninguna_ruta_administrativa_se_declara_publica(client):
    valor, _ = _cache_control(client.get("/api/v1/admin/products"))
    assert not valor.startswith("public")


# ---------------------------------------------------------------------------
# API pública: sigue siendo la decisión BK-06, sin cambios
# ---------------------------------------------------------------------------


def test_la_api_publica_conserva_su_valor(client):
    valor, _ = _cache_control(client.get("/api/v1/brands"))
    assert valor == _PUBLIC_API_CACHE_CONTROL
    assert "no-store" in valor


def test_admin_gana_sobre_el_prefijo_general_de_la_api(client):
    """`/api/v1/admin` es más específico que `/api/v1`: el orden importa."""
    publica, _ = _cache_control(client.get("/api/v1/brands"))
    privada, _ = _cache_control(client.get("/api/v1/admin/products"))

    assert publica != privada
    assert "private" in privada
    assert "private" not in publica


# ---------------------------------------------------------------------------
# Sonda operativa
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("ruta", ["/health/live", "/health/ready"])
def test_la_sonda_de_salud_no_se_almacena(client, ruta):
    """Un `ok` guardado tapa una caída: la sonda dejaría de servir para nada."""
    valor, _ = _cache_control(client.get(ruta))

    assert valor == _HEALTH_CACHE_CONTROL
    assert "no-store" in valor


# ---------------------------------------------------------------------------
# Documentos para rastreadores
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("ruta", ["/robots.txt", "/sitemap.xml", "/_seo/catalog"])
def test_los_documentos_de_rastreo_declaran_una_frescura_explicita(client, ruta):
    """Lo que se corrige es la ausencia, no el valor.

    Sin `Cache-Control` una caché aplica frescura heurística sobre
    `Last-Modified` (RFC 9111 §4.2.2): comportamiento indefinido y no elegido.
    """
    valor, _ = _cache_control(client.get(ruta))

    assert valor == _CRAWLER_CACHE_CONTROL
    assert "public" in valor
    assert "max-age=300" in valor


def test_la_ventana_de_rastreo_es_corta_para_que_un_cambio_llegue(client):
    """Cinco minutos: absorbe una ráfaga sin congelar el catálogo."""
    valor, _ = _cache_control(client.get("/sitemap.xml"))
    max_age = int(valor.split("max-age=")[1].split(",")[0])

    assert 0 < max_age <= 600


# ---------------------------------------------------------------------------
# Lo que Flask NO debe reclamar
# ---------------------------------------------------------------------------


def test_flask_no_declara_cache_para_lo_que_sirve_nginx(client):
    """La frontera del reparto.

    `/assets/`, `/fonts/` y `/uploads/` no llegan nunca a Flask en producción;
    si además Flask les pusiera una cabecera, cualquier futuro cambio de
    enrutamiento produciría dos. Una ruta desconocida cae en el 404 del SPA y no
    pertenece a ninguna clase de las de arriba.
    """
    from app.core.security.headers import _cache_control_for

    for ruta in ("/assets/index-abc123.js", "/fonts/Archivo-latin.woff2", "/uploads/a/b.webp"):
        assert _cache_control_for(ruta) is None, ruta


def test_el_middleware_completa_pero_no_pisa_a_la_vista(app):
    """`setdefault`: si una vista fija su propia política, la suya manda.

    Importa para no encerrar a una vista futura que necesite una caché
    distinta —una descarga, un recurso con `ETag` propio— dentro de la clase de
    su prefijo.
    """
    from flask import jsonify

    @app.get("/api/v1/_prueba_cache")
    def _vista():
        respuesta = jsonify({"ok": True})
        respuesta.headers["Cache-Control"] = "public, max-age=60"
        return respuesta

    respuesta = app.test_client().get("/api/v1/_prueba_cache")

    assert _cache_control(respuesta) == ("public, max-age=60", 1)
