"""Cloudflare Turnstile en el acceso a la tienda.

Ningún test llama de verdad a Cloudflare: `_siteverify` (la única función que
hace la petición de red) se reemplaza por un doble, así que lo que se fija
acá es el CONTRATO — qué hace el backend con lo que Cloudflare responde, no
si Cloudflare responde. La llamada real solo puede verificarse con
credenciales configuradas (ver el informe de cierre de la tarea).
"""

import app.services.turnstile_service as turnstile_service

RUTA_STATUS = "/api/v1/turnstile/status"
RUTA_VERIFY = "/api/v1/turnstile/verify"


def _habilitar(app, monkeypatch, *, exito=True):
    """Configura el backend como si Cloudflare estuviera configurado."""
    app.config["TURNSTILE_SECRET_KEY"] = "test-secret"
    app.config["TURNSTILE_SITE_KEY"] = "test-site-key"

    def _falso_siteverify(verify_url, secret, token, remote_ip):
        return {"success": exito, "error-codes": [] if exito else ["invalid-input-response"]}

    monkeypatch.setattr(turnstile_service, "_siteverify", _falso_siteverify)


def _cuerpo(respuesta):
    return respuesta.get_json()["data"]


# ---------------------------------------------------------------------------
# Modo de desarrollo: sin TURNSTILE_SECRET_KEY, el gate se desactiva solo.
# ---------------------------------------------------------------------------


def test_sin_credenciales_el_estado_dice_que_no_hace_falta(client, app):
    app.config["TURNSTILE_SECRET_KEY"] = ""

    datos = _cuerpo(client.get(RUTA_STATUS))

    assert datos == {"required": False, "verified": True}


def test_sin_credenciales_verify_no_aprueba_en_silencio(client, app):
    """Ni con un token cualquiera: sin secreto no hay con qué comprobar nada."""
    app.config["TURNSTILE_SECRET_KEY"] = ""

    respuesta = client.post(RUTA_VERIFY, json={"token": "cualquier-cosa"})

    assert respuesta.status_code == 502
    assert respuesta.get_json()["success"] is False


# ---------------------------------------------------------------------------
# Con credenciales configuradas
# ---------------------------------------------------------------------------


def test_con_credenciales_el_estado_pide_verificar_sin_cookie(client, app, monkeypatch):
    _habilitar(app, monkeypatch)

    datos = _cuerpo(client.get(RUTA_STATUS))

    assert datos == {"required": True, "verified": False}


def test_verify_sin_token_es_422(client, app, monkeypatch):
    _habilitar(app, monkeypatch)

    respuesta = client.post(RUTA_VERIFY, json={})

    assert respuesta.status_code == 422
    errores = respuesta.get_json()["errors"]
    assert errores[0]["field"] == "token"


def test_verify_con_token_que_cloudflare_rechaza_es_422(client, app, monkeypatch):
    _habilitar(app, monkeypatch, exito=False)

    respuesta = client.post(RUTA_VERIFY, json={"token": "token-invalido"})

    assert respuesta.status_code == 422
    assert respuesta.get_json()["success"] is False


def test_verify_con_token_valido_aprueba_y_pone_la_cookie(client, app, monkeypatch):
    _habilitar(app, monkeypatch, exito=True)

    respuesta = client.post(RUTA_VERIFY, json={"token": "token-real-de-cloudflare"})

    assert respuesta.status_code == 200
    assert _cuerpo(respuesta) == {"verified": True}

    set_cookie = respuesta.headers.get("Set-Cookie", "")
    assert "pablito_turnstile=" in set_cookie
    assert "HttpOnly" in set_cookie
    # Ámbito acotado a estas dos rutas: nunca debe llegar a /api/v1/admin ni
    # a ningún otro endpoint público.
    assert "Path=/api/v1/turnstile" in set_cookie


def test_status_despues_de_verificar_dice_verified_true(client, app, monkeypatch):
    """El flujo completo: verificar una vez y no volver a pedirlo en la visita."""
    _habilitar(app, monkeypatch, exito=True)

    client.post(RUTA_VERIFY, json={"token": "token-real-de-cloudflare"})
    datos = _cuerpo(client.get(RUTA_STATUS))

    assert datos == {"required": True, "verified": True}


def test_una_cookie_de_otra_firma_no_cuenta_como_verificado(client, app, monkeypatch):
    """Una cookie con el nombre correcto pero sin firmar no aprueba nada."""
    _habilitar(app, monkeypatch)

    client.set_cookie("pablito_turnstile", "valor-inventado-sin-firmar")
    datos = _cuerpo(client.get(RUTA_STATUS))

    assert datos == {"required": True, "verified": False}
