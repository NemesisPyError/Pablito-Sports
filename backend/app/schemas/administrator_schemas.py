"""Validación estructural de los payloads de usuarios (05_API.md §10.10).

Los schemas validan **forma**, no negocio, y no tocan la base (10_BACKEND.md
§8.2). Que el nombre de usuario esté libre o que quede un superadministrador
activo son reglas de negocio y viven en `services/`.

Un payload mal formado es `422` (05_API.md §11).
"""

import re
from dataclasses import dataclass

from ..core.exceptions import RequestValidationError
from ..core.security.password import policy_violation
from .shared import texto

# §9.2.13: conjunto cerrado, el mismo del CHECK `role_allowed`.
ROLES = ("administrator", "super_administrator")

# 04_BASE_DATOS.md §9.2.13.
MAX_USERNAME_LENGTH = 100
MAX_EMAIL_LENGTH = 255

# Comprobación deliberadamente laxa: el formato de correo no se valida a fondo
# con una expresión regular, se valida enviando un correo. Aquí solo se descarta
# lo que evidentemente no es una dirección.
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass
class AdministratorInput:
    username: str
    email: str
    role: str
    is_active: bool = True
    password: str | None = None


def _texto(payload: dict, campo: str, errores: list, *, maximo: int) -> str:
    """S-13: delega en `shared.texto`, que rechaza el tipo en vez de convertirlo."""
    return texto(payload, campo, errores, maximo=maximo)


def _rol(payload: dict, errores: list) -> str:
    # Sin `texto()` a propósito: el error útil acá no es «debe ser una cadena»
    # sino la lista de roles admitidos, y vale para los dos casos.
    rol = payload.get("role")
    rol = rol.strip() if isinstance(rol, str) else ""
    if rol not in ROLES:
        errores.append({"field": "role", "detail": "role must be one of " + ", ".join(ROLES)})
    return rol


def _password(payload: dict, campo: str, errores: list | None = None) -> str:
    """La contraseña, solo si es una cadena. Nunca llega un no-string a bcrypt.

    El motivo se dice tal cual —«must be a string»— en vez de dejar que la
    política responda «is required», que sería cierto pero confuso.
    """
    valor = payload.get(campo)
    if valor is None:
        return ""
    if not isinstance(valor, str):
        if errores is not None:
            errores.append({"field": campo, "detail": f"{campo} must be a string"})
        return ""
    return valor


def _correo(valor: str, errores: list) -> None:
    if valor and not EMAIL_PATTERN.match(valor):
        errores.append({"field": "email", "detail": "email must be a valid address"})


def _contrasena(valor: str, errores: list, *, campo: str = "password") -> None:
    """03_SEGURIDAD.md §5.5: longitud, tope de bcrypt y rechazo de lo trivial.

    Único punto de validación: lo usan tanto el alta como el cambio, de modo que
    la política no puede quedar desalineada entre los dos caminos.
    """
    motivo = policy_violation(valor)
    if motivo is not None:
        # `policy_violation` habla de "password"; el campo real puede ser
        # `new_password`, y el cliente necesita saber cuál corregir.
        errores.append({"field": campo, "detail": motivo.replace("password", campo, 1)})


def parse_administrator_create(payload: dict) -> AdministratorInput:
    """`AdministratorCreateDTO` (§10.10). Todos los campos son obligatorios."""
    errores: list[dict] = []
    username = _texto(payload, "username", errores, maximo=MAX_USERNAME_LENGTH)
    email = _texto(payload, "email", errores, maximo=MAX_EMAIL_LENGTH)
    _correo(email, errores)
    rol = _rol(payload, errores)
    password = _password(payload, "password", errores)
    if isinstance(payload.get("password"), str) or payload.get("password") is None:
        _contrasena(password, errores)

    if errores:
        raise RequestValidationError(errores)

    return AdministratorInput(
        username=username, email=email, role=rol, is_active=True, password=password
    )


def parse_administrator_update(payload: dict) -> AdministratorInput:
    """`AdministratorUpdateDTO` (§10.10). Reemplazo completo; sin contraseña.

    La contraseña tiene su propio endpoint (§9.14) precisamente para que una
    edición de perfil no pueda cambiarla de forma incidental.
    """
    errores: list[dict] = []
    username = _texto(payload, "username", errores, maximo=MAX_USERNAME_LENGTH)
    email = _texto(payload, "email", errores, maximo=MAX_EMAIL_LENGTH)
    _correo(email, errores)
    rol = _rol(payload, errores)

    if "is_active" not in payload:
        errores.append({"field": "is_active", "detail": "is_active is required"})
    elif not isinstance(payload["is_active"], bool):
        errores.append({"field": "is_active", "detail": "is_active must be a boolean"})

    if errores:
        raise RequestValidationError(errores)

    return AdministratorInput(
        username=username, email=email, role=rol, is_active=payload["is_active"]
    )


@dataclass
class PasswordChangeInput:
    current_password: str
    new_password: str


def parse_password_change(payload: dict) -> PasswordChangeInput:
    """§9.14. `current_password` solo es obligatoria al cambiar la propia.

    Esa condición depende de **quién** ejecuta sobre **quién**, que es negocio:
    el schema acepta que falte y el servicio decide si era exigible.
    """
    errores: list[dict] = []
    nueva = _password(payload, "new_password", errores)
    if isinstance(payload.get("new_password"), str) or payload.get("new_password") is None:
        _contrasena(nueva, errores, campo="new_password")

    if errores:
        raise RequestValidationError(errores)

    return PasswordChangeInput(
        current_password=_password(payload, "current_password", errores=None),
        new_password=nueva,
    )
