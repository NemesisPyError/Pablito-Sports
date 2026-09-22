"""Cloudflare Turnstile: verificación humana en el acceso a la tienda.

No usa ninguna librería HTTP nueva (`urllib` de la librería estándar alcanza
para una única llamada POST): agregar `requests` solo para esto no se
justifica.

La clave secreta (`TURNSTILE_SECRET_KEY`) nunca sale de este módulo. El
frontend solo conoce la clave pública (`TURNSTILE_SITE_KEY`, expuesta como
`VITE_TURNSTILE_SITE_KEY`) — "no considerar válida una verificación solamente
porque existe un token en frontend" se cumple acá: el único lugar que decide
si un token es válido es esta llamada a `siteverify`, del lado del servidor.
"""

import json
import urllib.error
import urllib.parse
import urllib.request

from flask import current_app
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from ..core.exceptions import IntegrationError, RequestValidationError

_TIMEOUT_SECONDS = 5
# Namespace del serializador: mismo `SECRET_KEY` que firma la sesión y el
# CSRF, pero con un `salt` propio para que un token de este propósito no
# pueda reutilizarse para firmar ni validar ningún otro.
_SIGNER_SALT = "pablito-turnstile-v1"


class TurnstileService:
    """Verifica el token de Turnstile y administra la cookie de "ya verificado"."""

    @staticmethod
    def enabled() -> bool:
        """Sin clave secreta el backend no puede llamar a Cloudflare.

        En ese caso el gate se desactiva en vez de romper el entorno local o
        aceptar cualquier token sin comprobarlo — pedido explícito del
        usuario para poder trabajar sin credenciales de Cloudflare.
        """
        return bool(current_app.config.get("TURNSTILE_SECRET_KEY"))

    @staticmethod
    def _serializer() -> URLSafeTimedSerializer:
        return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt=_SIGNER_SALT)

    @classmethod
    def is_verified(cls, cookie_value: str | None) -> bool:
        """Comprueba la cookie de verificación (firmada, con expiración).

        `False` ante cualquier cookie ausente, alterada o vencida: nunca se
        asume verificado por defecto.
        """
        if not cookie_value:
            return False
        max_age = current_app.config["TURNSTILE_COOKIE_MAX_AGE"]
        try:
            cls._serializer().loads(cookie_value, max_age=max_age)
        except (BadSignature, SignatureExpired):
            return False
        return True

    @classmethod
    def issue_cookie_value(cls) -> str:
        """Firma la marca de "verificado ahora".

        No es el token de Cloudflare reenviado: es propio del backend y
        expira solo (`max_age` en `is_verified`), así que no hace falta
        invalidarlo a mano.
        """
        return cls._serializer().dumps({"v": 1})

    @classmethod
    def verify(cls, token: str, remote_ip: str | None) -> None:
        """Valida `token` contra Cloudflare. No devuelve nada; lanza si falla.

        Cloudflare invalida cada token tras el primer `siteverify` exitoso
        (una segunda llamada con el mismo token responde
        `timeout-or-duplicate`): la protección contra reutilización del
        token la aplica Cloudflare, no una caché propia de este servicio.
        """
        if not cls.enabled():
            # `TurnstileGate` del frontend no debería llamar acá si el estado
            # ya dijo `required: false`, pero un cliente que lo ignore no
            # puede "verificarse" con un backend que no tiene con qué
            # comprobarlo.
            raise IntegrationError("Turnstile is not configured", provider="cloudflare")

        if not token or not isinstance(token, str):
            raise RequestValidationError([{"field": "token", "detail": "token is required"}])

        secret = current_app.config["TURNSTILE_SECRET_KEY"]
        verify_url = current_app.config["TURNSTILE_VERIFY_URL"]
        body = _siteverify(verify_url, secret, token, remote_ip)

        if not body.get("success"):
            raise RequestValidationError(
                [{"field": "token", "detail": "turnstile verification failed"}]
            )


def _siteverify(verify_url: str, secret: str, token: str, remote_ip: str | None) -> dict:
    """Llamada de red aislada en su propia función para poder mockearla en tests."""
    payload = {"secret": secret, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    data = urllib.parse.urlencode(payload).encode("ascii")
    request = urllib.request.Request(verify_url, data=data, method="POST")

    try:
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
            raw = response.read().decode("utf-8")
    except (urllib.error.URLError, TimeoutError) as exc:
        current_app.logger.warning("turnstile siteverify unreachable", extra={"error": str(exc)})
        raise IntegrationError(
            "could not reach Cloudflare Turnstile", provider="cloudflare"
        ) from exc

    try:
        return json.loads(raw)
    except ValueError as exc:
        current_app.logger.warning("turnstile siteverify returned invalid JSON")
        raise IntegrationError(
            "Cloudflare Turnstile returned an invalid response", provider="cloudflare"
        ) from exc
