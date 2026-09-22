"""Las URLs de redes sociales sólo pueden ser http(s) (S-13).

**El problema.** `social_links` se guarda como JSONB libre y el pie público lo
pinta tal cual en el `href` de cada enlace (`PublicFooter.jsx`). El schema
comprobaba que los valores fueran cadenas, pero no el esquema de la URL: un
`javascript:...` guardado desde el panel se convertía en XSS almacenado para
todos los visitantes de la tienda.

**Alcance real.** Exige un administrador autenticado, que es el rol de más
confianza del sistema, así que no es una escalada desde fuera. Se corrige igual
porque validar en el límite de datos cuesta tres líneas y protege a cualquier
consumidor futuro del campo, no sólo al pie de página de hoy: `rel="noreferrer"`
y `target="_blank"` no hacen nada frente a `javascript:`.
"""

import pytest

from app.schemas.store_setting_schemas import _redes

PELIGROSOS = [
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "  javascript:alert(1)  ",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    # Sin esquema: el navegador lo resolvería contra el origen actual, y como
    # enlace de "red social" no significa nada.
    "//evil.example/perfil",
    "/relativo",
    "evil.example",
]

VALIDOS = [
    "https://instagram.com/pablitosports",
    "http://facebook.com/pablitosports",
    "HTTPS://X.COM/pablitosports",
    "https://wa.me/595971234567",
]


@pytest.mark.parametrize("url", PELIGROSOS)
def test_se_rechaza_un_esquema_que_el_navegador_podria_ejecutar(url):
    errores: list[dict] = []
    resultado = _redes({"social_links": {"instagram": url}}, errores)

    assert errores, f"{url!r} debería rechazarse"
    assert errores[0]["field"] == "social_links"
    assert resultado is None


@pytest.mark.parametrize("url", VALIDOS)
def test_se_acepta_una_url_de_navegacion_normal(url):
    errores: list[dict] = []
    resultado = _redes({"social_links": {"instagram": url}}, errores)

    assert errores == [], f"{url!r} debería aceptarse"
    assert resultado == {"instagram": url.strip()}


def test_una_sola_url_peligrosa_invalida_el_conjunto():
    """No se guarda «lo bueno» descartando lo malo en silencio."""
    errores: list[dict] = []
    resultado = _redes(
        {
            "social_links": {
                "instagram": "https://instagram.com/ok",
                "facebook": "javascript:alert(1)",
            }
        },
        errores,
    )

    assert errores
    assert resultado is None


def test_el_mensaje_dice_que_corregir_sin_repetir_el_valor():
    errores: list[dict] = []
    _redes({"social_links": {"x": "javascript:alert('marca-secreta')"}}, errores)

    detalle = errores[0]["detail"]
    assert "http" in detalle
    assert "marca-secreta" not in detalle


def test_lo_vacio_y_lo_ausente_siguen_comportandose_igual():
    """La corrección no puede cambiar el trato de «no se cargó ninguna red»."""
    assert _redes({}, []) is None
    assert _redes({"social_links": None}, []) is None
    assert _redes({"social_links": {}}, []) is None
    assert _redes({"social_links": {"instagram": "   "}}, []) is None
    assert _redes({"social_links": {"instagram": None}}, []) is None


def test_un_valor_que_no_es_cadena_sigue_rechazandose():
    errores: list[dict] = []
    assert _redes({"social_links": {"instagram": 123}}, errores) is None
    assert errores


def test_social_links_debe_ser_un_objeto():
    errores: list[dict] = []
    assert _redes({"social_links": ["https://x.com"]}, errores) is None
    assert errores
