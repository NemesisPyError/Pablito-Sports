"""Endurecimiento de sesiones, cookies y confianza de proxy (03_SEGURIDAD.md §7, §14.2).

`TestingConfig` desactiva CSRF y rate limiting; aquí se construyen aplicaciones
dedicadas cuando hace falta encenderlos, igual que en `test_admin_users_hardening`.

Cubre lo que la tanda de seguridad añadió:
- rotación del identificador de sesión tras el login (session fixation);
- flags de la cookie de sesión;
- que un `X-Forwarded-For` inyectado por el cliente no se cree como IP real.
"""

import secrets

import pytest
from flask_migrate import upgrade

from app import create_app
from app.core.config import TestingConfig
from app.core.security.password import hash_password
from app.extensions import db
from app.models import Administrator

PREFIJO = "session-test"
PASSWORD = f"pw-{secrets.token_urlsafe(16)}"


def _aplicacion(**overrides):
    class Config(TestingConfig):
        pass

    for clave, valor in overrides.items():
        setattr(Config, clave, valor)

    aplicacion = create_app(Config)
    with aplicacion.app_context():
        upgrade()
    return aplicacion


def _crear_admin(sufijo: str) -> int:
    administrador = Administrator(
        username=f"{PREFIJO}-{sufijo}",
        email=f"{PREFIJO}-{sufijo}@pablitosports.test",
        password_hash=hash_password(PASSWORD),
        role="administrator",
        is_active=True,
    )
    db.session.add(administrador)
    db.session.commit()
    return administrador.id


def _limpiar():
    db.session.execute(
        db.text(
            "DELETE FROM audit_logs WHERE administrator_id IN "
            "(SELECT id FROM administrators WHERE username LIKE :p)"
        ),
        {"p": f"{PREFIJO}%"},
    )
    db.session.execute(
        db.text("DELETE FROM administrators WHERE username LIKE :p"), {"p": f"{PREFIJO}%"}
    )
    db.session.commit()


def _session_cookie(response):
    """Devuelve el `Set-Cookie` de la sesión, o None si no se emitió."""
    for cookie in response.headers.getlist("Set-Cookie"):
        if cookie.startswith("session="):
            return cookie
    return None


def _sid_value(response):
    """Extrae el valor firmado del sid del `Set-Cookie` de sesión."""
    cookie = _session_cookie(response)
    if cookie is None:
        return None
    return cookie.split(";", 1)[0].split("=", 1)[1]


@pytest.fixture
def app_dedicada(app):
    with app.app_context():
        upgrade()
        _limpiar()
        identificador = _crear_admin("base")
        try:
            yield app, identificador
        finally:
            _limpiar()


# --- Session fixation: rotación del sid en el login -------------------------


def test_el_login_rota_el_identificador_de_sesion(app_dedicada):
    """§7.2: cada login exitoso emite un sid nuevo (anti session fixation).

    Un primer login establece un sid; un segundo login sobre el mismo cliente
    —que ya trae esa cookie— debe emitir uno distinto. Si el sid no rotara, un
    identificador fijado de antemano seguiría vigente tras autenticar.
    """
    app, _ = app_dedicada
    client = app.test_client()

    primero = client.post(
        "/api/v1/admin/auth/login",
        json={"username": f"{PREFIJO}-base", "password": PASSWORD},
    )
    assert primero.status_code == 200
    sid_primero = _sid_value(primero)
    assert sid_primero is not None

    # El cliente ya tiene la cookie del primer login; el segundo debe rotarla.
    segundo = client.post(
        "/api/v1/admin/auth/login",
        json={"username": f"{PREFIJO}-base", "password": PASSWORD},
    )
    assert segundo.status_code == 200
    sid_segundo = _sid_value(segundo)
    assert sid_segundo is not None

    assert sid_segundo != sid_primero


def test_la_cookie_de_sesion_tiene_los_flags_correctos(app_dedicada):
    """§7.1: HttpOnly, SameSite=Strict, Path acotado al panel."""
    app, _ = app_dedicada
    client = app.test_client()

    login = client.post(
        "/api/v1/admin/auth/login",
        json={"username": f"{PREFIJO}-base", "password": PASSWORD},
    )
    cookie = _session_cookie(login)
    assert cookie is not None
    assert "HttpOnly" in cookie
    assert "SameSite=Strict" in cookie
    assert "Path=/api/v1/admin" in cookie
    # En testing no hay TLS, así que Secure está deshabilitado a propósito.
    assert "Secure" not in cookie


def test_logout_cierra_la_sesion(app_dedicada):
    """§7.3: tras logout, la sesión ya no autentica."""
    app, _ = app_dedicada
    client = app.test_client()

    client.post(
        "/api/v1/admin/auth/login",
        json={"username": f"{PREFIJO}-base", "password": PASSWORD},
    )
    assert client.get("/api/v1/admin/auth/me").status_code == 200

    client.post("/api/v1/admin/auth/logout")
    assert client.get("/api/v1/admin/auth/me").status_code == 401


# --- Confianza de proxy: X-Forwarded-For no falsificable --------------------


def test_un_forwarded_for_inyectado_no_se_cree_como_ip_real():
    """§14.2: con ProxyFix (1 salto), solo se confía en el último proxy.

    El valor que antepone un cliente queda fuera de la ventana de confianza. Se
    captura la IP que ve la aplicación a través de un endpoint de sondeo mínimo.
    """
    app = _aplicacion(TRUSTED_PROXY_COUNT=1)

    vistas = {}

    @app.route("/__probe_ip")
    def _probe():
        from flask import request

        vistas["ip"] = request.remote_addr
        return "", 204

    client = app.test_client()
    # Cadena tal como llega tras un proxy de confianza: el cliente antepuso
    # `203.0.113.5` (falsificado) y el proxy añadió el peer real `198.51.100.9`
    # como último elemento. Con 1 salto de confianza, ProxyFix se queda con el
    # último y descarta lo que el cliente inyectó a la izquierda.
    client.get("/__probe_ip", headers={"X-Forwarded-For": "203.0.113.5, 198.51.100.9"})

    assert vistas["ip"] == "198.51.100.9"  # el salto de confianza
    assert vistas["ip"] != "203.0.113.5"  # el valor inyectado, ignorado


def test_proxy_fix_desactivado_no_reescribe(app):
    """`TRUSTED_PROXY_COUNT=0` deja el entorno WSGI intacto (sin proxy)."""
    app_sin_proxy = _aplicacion(TRUSTED_PROXY_COUNT=0)

    @app_sin_proxy.route("/__probe_ip0")
    def _probe0():
        from flask import request

        return request.remote_addr or "", 200

    client = app_sin_proxy.test_client()
    r = client.get("/__probe_ip0", headers={"X-Forwarded-For": "203.0.113.5"})
    # Sin ProxyFix, el XFF inyectado se ignora por completo: nunca es remote_addr.
    assert r.get_data(as_text=True) != "203.0.113.5"
