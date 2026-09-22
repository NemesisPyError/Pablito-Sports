"""Cookie de verificación de Turnstile: firma propia del backend.

No es el token de Cloudflare — es la marca que el backend emite después de
validarlo, para no pedir la verificación en cada carga de la tienda. Estos
tests fijan que esa marca sea imposible de falsificar sin conocer
`SECRET_KEY`, que es la garantía real detrás de "no considerar válida una
verificación solamente porque existe un token en frontend".
"""

from itsdangerous import URLSafeTimedSerializer

from app import create_app
from app.core.config import TestingConfig
from app.services.turnstile_service import TurnstileService


def _app():
    application = create_app(TestingConfig)
    application.config["SECRET_KEY"] = "clave-de-prueba-" + "x" * 40
    return application


def test_una_cookie_recien_emitida_se_reconoce_como_verificada():
    app = _app()
    with app.app_context():
        valor = TurnstileService.issue_cookie_value()

        assert TurnstileService.is_verified(valor) is True


def test_sin_cookie_no_esta_verificado():
    app = _app()
    with app.app_context():
        assert TurnstileService.is_verified(None) is False
        assert TurnstileService.is_verified("") is False


def test_una_cookie_alterada_no_cuenta():
    app = _app()
    with app.app_context():
        valor = TurnstileService.issue_cookie_value()
        # Se altera el medio de la firma, no el último carácter: en base64
        # sin relleno el último carácter de un tramo puede codificar solo
        # algunos bits significativos, y cambiarlo no siempre cambia el byte
        # decodificado (falso negativo intermitente, visto en la suite
        # completa). El medio no tiene ese caso de borde.
        posicion = len(valor) // 2
        caracter_distinto = "a" if valor[posicion] != "a" else "b"
        valor_alterado = valor[:posicion] + caracter_distinto + valor[posicion + 1 :]

        assert TurnstileService.is_verified(valor_alterado) is False


def test_una_cookie_firmada_con_otra_secret_key_no_cuenta():
    """Simula un backend distinto (u otro entorno) intentando firmar la misma cookie."""
    app = _app()
    otro_serializer = URLSafeTimedSerializer(
        "otra-clave-completamente-distinta", salt="pablito-turnstile-v1"
    )
    valor_ajeno = otro_serializer.dumps({"v": 1})

    with app.app_context():
        assert TurnstileService.is_verified(valor_ajeno) is False


def test_enabled_solo_cuando_hay_secret_key():
    app = _app()
    with app.app_context():
        app.config["TURNSTILE_SECRET_KEY"] = ""
        assert TurnstileService.enabled() is False

        app.config["TURNSTILE_SECRET_KEY"] = "algo"
        assert TurnstileService.enabled() is True
