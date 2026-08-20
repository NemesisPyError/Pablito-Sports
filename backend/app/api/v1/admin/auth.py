"""Administrative authentication endpoints (05_API.md §5.1, §9.1)."""

from flask import Blueprint, current_app, request, session
from flask_wtf.csrf import generate_csrf

from ....core.exceptions import RequestValidationError
from ....core.utils.responses import success_response
from ....extensions import csrf, limiter
from ....services.admin_auth_service import AdminAuthService

auth_bp = Blueprint("admin_auth", __name__)


@auth_bp.post("/auth/login")
# §8.2: el token CSRF se genera en el servidor y se entrega al frontend **en el
# login**, de modo que el propio login no puede exigirlo: no existe todavía.
@csrf.exempt
# 03_SEGURIDAD.md §14.1: 5 intentos cada 15 minutos por IP.
@limiter.limit("5 per 15 minutes", methods=["POST"])
def login():
    """POST /api/v1/admin/auth/login.

    Abre la sesión de servidor y entrega el token CSRF que el panel usará en
    las escrituras posteriores (§8.2: se envía al frontend en el login).
    """
    payload = request.get_json(silent=True) or {}
    username = (payload.get("username") or "").strip()
    password = payload.get("password") or ""

    errors = []
    if not username:
        errors.append({"field": "username", "detail": "username is required"})
    if not password:
        errors.append({"field": "password", "detail": "password is required"})
    if errors:
        raise RequestValidationError(errors)

    administrator = AdminAuthService.login(username, password)

    # 03_SEGURIDAD.md §7.2: rotación del identificador de sesión tras autenticar
    # con éxito. El servicio ya pobló la sesión; `regenerate` borra el registro
    # del `sid` anterior y emite uno nuevo, de modo que un `sid` que un atacante
    # hubiera fijado en el navegador de la víctima **deja de ser válido**
    # (defensa contra session fixation). Vive en la capa HTTP porque toca la
    # interfaz de sesión, que `services/` no puede conocer (10_BACKEND.md §8.4).
    current_app.session_interface.regenerate(session)

    return success_response(
        {"administrator": administrator, "csrf_token": generate_csrf()},
    )


@auth_bp.post("/auth/logout")
def logout():
    """POST /api/v1/admin/auth/logout. §7.3: invalida la sesión actual."""
    AdminAuthService.logout()
    return success_response(None)


@auth_bp.get("/auth/me")
def me():
    """GET /api/v1/admin/auth/me.

    El panel lo llama en cada carga para determinar rol y permisos (07 §6.1).
    Devuelve también el token CSRF para que una sesión rehidratada pueda escribir.
    """
    administrator = AdminAuthService.require_administrator()
    return success_response(
        {
            "administrator": AdminAuthService.to_dto(administrator),
            "csrf_token": generate_csrf(),
        },
    )
