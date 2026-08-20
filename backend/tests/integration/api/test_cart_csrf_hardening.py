"""CSRF sobre el carrito público (03_SEGURIDAD.md §8.3, 05_API.md §8).

`TestingConfig` desactiva CSRF para el resto de la suite (10_BACKEND.md §12);
aquí se vuelve a encender sobre una aplicación dedicada, igual que en
`test_admin_users_hardening` y `test_session_hardening`.

Regresión: `csrf.exempt(public_bp)` en `app/api/__init__.py` no alcanza a los
blueprints anidados dentro de `public_bp` (`request.blueprint` resuelve al
nombre punteado del hijo, p. ej. `"public.cart"`, y Flask-WTF solo compara
contra el objeto exacto que se le pasó a `exempt()`). `POST /cart/revalidate`
es la única escritura de la API pública, así que era el único punto donde el
bug se manifestaba: devolvía `403 csrf_token_invalid` para cualquier cliente
anónimo, rompiendo el flujo de carrito → WhatsApp por completo.
"""

import pytest
from flask_migrate import upgrade

from app import create_app
from app.core.config import TestingConfig

URL = "/api/v1/cart/revalidate"


def _aplicacion(**overrides):
    class Config(TestingConfig):
        pass

    for clave, valor in overrides.items():
        setattr(Config, clave, valor)

    aplicacion = create_app(Config)
    with aplicacion.app_context():
        upgrade()
    return aplicacion


@pytest.fixture(scope="module")
def app_con_csrf():
    return _aplicacion(WTF_CSRF_ENABLED=True)


def test_revalidar_carrito_sin_token_csrf_no_es_403(app_con_csrf):
    """§8.3: la API pública es anónima y de solo lectura salvo este endpoint,
    que tampoco exige token porque no crea recurso alguno (AD-32)."""
    client = app_con_csrf.test_client()

    respuesta = client.post(URL, json={"cart_content_version": 1, "items": []})

    assert respuesta.status_code == 200
    assert respuesta.get_json()["success"] is True
