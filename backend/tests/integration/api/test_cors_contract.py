"""La API no concede permisos CORS a nadie (S-11, 02_ARQUITECTURA.md §16.6).

**La conclusión de la auditoría es que CORS no hace falta**, así que lo que estos
tests fijan no es una lista de orígenes permitidos: es la ausencia total de
concesión. `AD-04`: Nginx sirve el SPA y la API bajo el mismo origen, y el
frontend llama a `/api/v1` con ruta relativa (`VITE_API_BASE_URL: /api/v1` en
desarrollo y en producción). Ninguna petición del producto es cross-origin.

Sin `Access-Control-Allow-Origin`, la política de mismo origen del navegador
impide que una página de otro dominio **lea** la respuesta, aunque el servidor
la haya devuelto con 200. Eso es exactamente lo que se quiere.

Por qué existe esta suite si no hay nada que configurar: para que **no aparezca**
sin que nadie lo decida. Instalar Flask-CORS y llamar a `CORS(app)` es una línea,
el valor por defecto de esa librería es `Access-Control-Allow-Origin: *`, y sin
un test que lo vigile el cambio pasaría inadvertido en una revisión.

Segunda barrera, independiente de CORS: la cookie de sesión es `SameSite=Strict`,
así que el navegador no la manda en ninguna petición cross-site. Aunque alguien
habilitara CORS con credenciales, no habría sesión que robar por esa vía.
"""

import pytest

# Orígenes de prueba. Ninguno debe recibir permiso: ni uno externo, ni el que
# «parece» el bueno, ni el opaco `null` que envían los iframes con sandbox y los
# documentos abiertos desde `file://`.
ORIGENES = [
    "https://pablitosports.com",
    "https://evil.example",
    "http://localhost:8080",
    "http://localhost",
    "null",
    "https://pablitosports.com.evil.example",
]

CABECERAS_CORS = (
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Headers",
    "Access-Control-Expose-Headers",
    "Access-Control-Max-Age",
)

PUBLICOS = ["/api/v1/brands", "/api/v1/products", "/api/v1/categories"]
ADMINISTRATIVOS = ["/api/v1/admin/products", "/api/v1/admin/users", "/api/v1/admin/dashboard"]


def _cabeceras_cors(respuesta) -> dict:
    """Las cabeceras CORS presentes, con cuántas veces aparece cada una."""
    return {
        nombre: respuesta.headers.getlist(nombre)
        for nombre in CABECERAS_CORS
        if respuesta.headers.getlist(nombre)
    }


# ---------------------------------------------------------------------------
# 1-3. Ningún origen obtiene permiso: ni el «bueno», ni uno ajeno, ni reflejo
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("origen", ORIGENES)
@pytest.mark.parametrize("ruta", PUBLICOS)
def test_la_api_publica_no_concede_cors_a_ningun_origen(client, ruta, origen):
    respuesta = client.get(ruta, headers={"Origin": origen})

    assert respuesta.status_code == 200
    assert _cabeceras_cors(respuesta) == {}


@pytest.mark.parametrize("origen", ORIGENES)
@pytest.mark.parametrize("ruta", ADMINISTRATIVOS)
def test_la_api_administrativa_no_concede_cors_a_ningun_origen(client, ruta, origen):
    respuesta = client.get(ruta, headers={"Origin": origen})

    assert respuesta.status_code == 401
    assert _cabeceras_cors(respuesta) == {}


def test_el_origin_no_se_refleja_nunca(client):
    """Reflejar el `Origin` recibido equivale a permitir cualquier dominio."""
    for origen in ORIGENES:
        respuesta = client.get("/api/v1/brands", headers={"Origin": origen})
        cabecera = respuesta.headers.get("Access-Control-Allow-Origin")

        assert cabecera is None, f"{origen} recibió {cabecera}"
        # Ni siquiera aparece en otra cabecera de la respuesta.
        assert origen not in str(dict(respuesta.headers))


def test_sin_cabecera_origin_el_comportamiento_es_el_mismo(client):
    """Una petición del propio SPA no lleva `Origin` en un GET same-origin."""
    respuesta = client.get("/api/v1/brands")

    assert respuesta.status_code == 200
    assert _cabeceras_cors(respuesta) == {}


# ---------------------------------------------------------------------------
# 4. Nada de comodines, y menos con credenciales
# ---------------------------------------------------------------------------


def test_no_existe_comodin_en_ninguna_respuesta(client):
    """`Access-Control-Allow-Origin: *` es el valor por defecto de Flask-CORS."""
    for ruta in PUBLICOS + ADMINISTRATIVOS:
        respuesta = client.get(ruta, headers={"Origin": "https://evil.example"})
        assert respuesta.headers.get("Access-Control-Allow-Origin") != "*"


def test_no_se_conceden_credenciales(client):
    """`Allow-Credentials: true` junto a un comodín es la combinación prohibida.

    Acá no hay ninguna de las dos, así que la combinación no puede darse; el
    test fija que siga siendo así.
    """
    for ruta in PUBLICOS + ADMINISTRATIVOS:
        respuesta = client.get(ruta, headers={"Origin": "https://evil.example"})

        assert respuesta.headers.get("Access-Control-Allow-Credentials") is None
        assert respuesta.headers.get("Access-Control-Allow-Origin") is None


# ---------------------------------------------------------------------------
# 5-7. Preflight, métodos y cabeceras
# ---------------------------------------------------------------------------


def test_el_preflight_no_obtiene_permiso(client):
    """Flask responde al OPTIONS, pero sin cabeceras CORS el preflight falla.

    El navegador exige `Access-Control-Allow-Origin` en la respuesta al OPTIONS;
    sin ella no llega a enviar la petición real. Que el OPTIONS devuelva 200 no
    concede nada por sí solo.
    """
    respuesta = client.options(
        "/api/v1/brands",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-CSRF-Token, Content-Type",
        },
    )

    assert _cabeceras_cors(respuesta) == {}


def test_el_preflight_de_una_ruta_administrativa_tampoco(client):
    respuesta = client.options(
        "/api/v1/admin/auth/login",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )

    assert _cabeceras_cors(respuesta) == {}


def test_el_options_no_anuncia_metodos_que_la_ruta_no_tiene(client):
    """`Allow` lo genera Flask por ruta; que no se amplíe de más.

    No es una cabecera CORS, pero es la única lista de métodos que la API
    publica, y aquí se comprueba que refleja la ruta y nada más.
    """
    listado = client.options("/api/v1/brands")
    login = client.options("/api/v1/admin/auth/login")

    metodos_listado = {m.strip() for m in listado.headers["Allow"].split(",")}
    metodos_login = {m.strip() for m in login.headers["Allow"].split(",")}

    assert metodos_listado == {"GET", "HEAD", "OPTIONS"}
    assert "POST" not in metodos_listado
    assert metodos_login == {"POST", "OPTIONS"}
    assert "GET" not in metodos_login


def test_una_cabecera_no_autorizada_no_queda_permitida(client):
    """Pedir `Authorization` en el preflight no hace que se conceda."""
    respuesta = client.options(
        "/api/v1/brands",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization, X-Cualquier-Cosa",
        },
    )

    assert respuesta.headers.get("Access-Control-Allow-Headers") is None


# ---------------------------------------------------------------------------
# 10. Login y logout
# ---------------------------------------------------------------------------


def test_el_login_no_concede_cors(client):
    respuesta = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "inexistente", "password": "una-contrasena-cualquiera"},
        headers={"Origin": "https://evil.example"},
    )

    assert respuesta.status_code == 401
    assert _cabeceras_cors(respuesta) == {}


def test_el_logout_no_concede_cors(client):
    respuesta = client.post("/api/v1/admin/auth/logout", headers={"Origin": "https://evil.example"})

    assert _cabeceras_cors(respuesta) == {}


# ---------------------------------------------------------------------------
# La decisión, fijada donde se pueda romper sin querer
# ---------------------------------------------------------------------------


def test_no_hay_ninguna_extension_de_cors_registrada(app):
    """Si alguien instala Flask-CORS y llama a `CORS(app)`, esto falla.

    Es el modo realista de que aparezca CORS sin que nadie lo decida: la
    librería añade su propio `after_request` y su valor por defecto es el
    comodín.
    """
    assert "cors" not in app.extensions

    nombres = [f.__qualname__ for funciones in app.after_request_funcs.values() for f in funciones]
    assert not any("cors" in nombre.lower() for nombre in nombres), nombres


def test_la_cookie_de_sesion_es_samesite_strict(app):
    """La barrera que no depende de CORS.

    Con `Strict`, el navegador no envía la cookie en NINGUNA petición
    cross-site. Es lo que hace que una hipotética habilitación de CORS con
    credenciales siguiera sin exponer la sesión del panel.
    """
    assert app.config["SESSION_COOKIE_SAMESITE"] == "Strict"
    assert app.config["SESSION_COOKIE_HTTPONLY"] is True
