"""CSRF y rate limiting sobre usuarios (03_SEGURIDAD.md §8 y §14.1).

`TestingConfig` desactiva ambos para que el resto de la suite no dependa del
orden ni arrastre cupos entre tests. Aquí se vuelven a encender sobre
aplicaciones dedicadas, que es lo que esa configuración dice explícitamente que
debe hacerse.
"""

import secrets

import pytest
from flask_migrate import upgrade

from app import create_app
from app.core.config import TestingConfig
from app.core.security.password import hash_password
from app.extensions import db, limiter
from app.models import Administrator

PREFIJO = "hardening-test"
PASSWORD = f"pw-{secrets.token_urlsafe(16)}"


def _crear_super(sufijo: str) -> int:
    administrador = Administrator(
        username=f"{PREFIJO}-{sufijo}",
        email=f"{PREFIJO}-{sufijo}@pablitosports.test",
        password_hash=hash_password(PASSWORD),
        role="super_administrator",
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


def _sesion(client, administrator_id: int):
    from datetime import UTC, datetime

    with client.session_transaction() as sesion:
        sesion["admin_id"] = administrator_id
        sesion["logged_in_at"] = datetime.now(UTC).isoformat()
        sesion["last_seen_at"] = datetime.now(UTC).isoformat()


def _aplicacion(**overrides):
    class Config(TestingConfig):
        pass

    for clave, valor in overrides.items():
        setattr(Config, clave, valor)

    aplicacion = create_app(Config)
    with aplicacion.app_context():
        upgrade()
    return aplicacion


# CSRF (§8)


@pytest.fixture
def app_con_csrf():
    aplicacion = _aplicacion(WTF_CSRF_ENABLED=True)
    with aplicacion.app_context():
        _limpiar()
        identificador = _crear_super("csrf")
        try:
            yield aplicacion, identificador
        finally:
            _limpiar()


def test_escritura_de_usuarios_sin_token_csrf_es_403(app_con_csrf):
    """§8: toda escritura del panel exige el token."""
    aplicacion, identificador = app_con_csrf
    client = aplicacion.test_client()
    _sesion(client, identificador)

    respuesta = client.post(
        "/api/v1/admin/users",
        json={
            "username": f"{PREFIJO}-sin-token",
            "email": f"{PREFIJO}-sin-token@pablitosports.test",
            "password": PASSWORD,
            "role": "administrator",
        },
    )

    assert respuesta.status_code == 403
    assert respuesta.get_json()["errors"][0]["code"] == "csrf_token_invalid"


def test_escritura_de_usuarios_con_token_csrf_funciona(app_con_csrf):
    """El token se obtiene como lo obtiene el panel: del login (§8.2)."""
    aplicacion, identificador = app_con_csrf
    client = aplicacion.test_client()

    login = client.post(
        "/api/v1/admin/auth/login",
        json={"username": f"{PREFIJO}-csrf", "password": PASSWORD},
    )
    assert login.status_code == 200
    token = login.get_json()["data"]["csrf_token"]

    respuesta = client.post(
        "/api/v1/admin/users",
        json={
            "username": f"{PREFIJO}-con-token",
            "email": f"{PREFIJO}-con-token@pablitosports.test",
            "password": PASSWORD,
            "role": "administrator",
        },
        headers={"X-CSRF-Token": token},
    )

    assert respuesta.status_code == 201


def test_escritura_de_promociones_sin_token_csrf_es_403(app_con_csrf):
    """§8 alcanza a toda escritura del panel, no solo a usuarios."""
    aplicacion, identificador = app_con_csrf
    client = aplicacion.test_client()
    _sesion(client, identificador)

    respuesta = client.post("/api/v1/admin/promotions", json={})

    assert respuesta.status_code == 403
    assert respuesta.get_json()["errors"][0]["code"] == "csrf_token_invalid"


def test_la_lectura_de_usuarios_no_exige_token_csrf(app_con_csrf):
    """§8.3: el token protege escrituras; una lectura no cambia estado."""
    aplicacion, identificador = app_con_csrf
    client = aplicacion.test_client()
    _sesion(client, identificador)

    assert client.get("/api/v1/admin/users").status_code == 200


def test_el_403_de_csrf_conserva_el_request_id(app_con_csrf):
    """El handler de CSRF corre antes que el middleware de correlación (OA-09).

    Sin la red de seguridad de `_ensure_request_id`, `meta.request_id` salía
    `null` en este 403 concreto —el único error que aborta en un `before_request`
    previo al de `request_context`— y el evento quedaba sin correlacionar.
    """
    aplicacion, identificador = app_con_csrf
    client = aplicacion.test_client()
    _sesion(client, identificador)

    respuesta = client.post("/api/v1/admin/promotions", json={})
    cuerpo = respuesta.get_json()

    assert respuesta.status_code == 403
    assert cuerpo["errors"][0]["code"] == "csrf_token_invalid"
    assert cuerpo["meta"]["request_id"] is not None
    assert respuesta.headers.get("X-Request-Id") == cuerpo["meta"]["request_id"]


# Rate limiting (§14.1)


@pytest.fixture
def app_con_limite():
    aplicacion = _aplicacion(RATELIMIT_ENABLED=True)
    with aplicacion.app_context():
        _limpiar()
        identificador = _crear_super("limite")
        try:
            yield aplicacion, identificador
        finally:
            _limpiar()
    limiter.reset()


def test_change_password_se_limita_a_tres_intentos(app_con_limite):
    """§14.1: 3 intentos cada 15 minutos por sesión."""
    aplicacion, identificador = app_con_limite
    client = aplicacion.test_client()
    _sesion(client, identificador)

    codigos = []
    for _ in range(4):
        respuesta = client.post(
            f"/api/v1/admin/users/{identificador}/change-password",
            json={"current_password": "incorrecta-a-proposito", "new_password": PASSWORD},
        )
        codigos.append(respuesta.status_code)

    # Los tres primeros llegan al servicio y fallan por credenciales; el cuarto
    # ya no llega.
    assert codigos[:3] == [401, 401, 401]
    assert codigos[3] == 429


def test_el_limite_no_afecta_a_las_demas_rutas_de_usuarios(app_con_limite):
    """§14.1 solo limita `change-password`; el resto del CRUD no lleva cupo."""
    aplicacion, identificador = app_con_limite
    client = aplicacion.test_client()
    _sesion(client, identificador)

    for _ in range(6):
        assert client.get("/api/v1/admin/users").status_code == 200
