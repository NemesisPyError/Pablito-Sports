"""Verificación de Cloudflare Turnstile en el acceso a la tienda.

Dos rutas: `GET /turnstile/status` (¿hace falta mostrar el widget?) y
`POST /turnstile/verify` (validar el token que devolvió el widget). El
frontend consulta la primera una sola vez al entrar — nunca en cada
navegación interna del SPA — y solo llama a la segunda cuando el widget
entrega un token nuevo.
"""

from flask import Blueprint, current_app, request

from ....core.utils.responses import success_response
from ....extensions import limiter
from ....schemas.shared import json_body
from ....services.turnstile_service import TurnstileService

turnstile_bp = Blueprint("turnstile", __name__)


def _set_verified_cookie(response):
    response.set_cookie(
        current_app.config["TURNSTILE_COOKIE_NAME"],
        TurnstileService.issue_cookie_value(),
        max_age=current_app.config["TURNSTILE_COOKIE_MAX_AGE"],
        path=current_app.config["TURNSTILE_COOKIE_PATH"],
        httponly=True,
        secure=current_app.config["SESSION_COOKIE_SECURE"],
        samesite="Strict",
    )
    return response


@turnstile_bp.get("/turnstile/status")
def status():
    """GET /api/v1/turnstile/status.

    `required=False` es el atajo de desarrollo: sin `TURNSTILE_SECRET_KEY`
    configurada el backend no tiene con qué validar nada, así que no tiene
    sentido pedirle al cliente un widget que el servidor no podría comprobar.
    """
    if not TurnstileService.enabled():
        return success_response({"required": False, "verified": True})

    cookie_value = request.cookies.get(current_app.config["TURNSTILE_COOKIE_NAME"])
    verified = TurnstileService.is_verified(cookie_value)
    return success_response({"required": True, "verified": verified})


@turnstile_bp.post("/turnstile/verify")
# 03_SEGURIDAD.md §14.1, mismo criterio que el login: limita cuánto puede
# martillar una IP esta ruta, que en cada intento llama a un servicio externo.
@limiter.limit("20 per minute", methods=["POST"])
def verify():
    """POST /api/v1/turnstile/verify.

    Valida el token contra Cloudflare (`TurnstileService.verify`, nunca
    confía en que el token exista sin más) y, solo si es válido, emite la
    cookie firmada que evita pedir la verificación de nuevo en esta misma
    visita.
    """
    payload = json_body()
    TurnstileService.verify(payload.get("token"), request.remote_addr)

    response, status_code = success_response({"verified": True})
    return _set_verified_cookie(response), status_code
