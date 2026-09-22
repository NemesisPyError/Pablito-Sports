"""Un tipo equivocado en la entrada es 4xx, nunca 500 (S-13).

La regresión que fija esta suite se midió, no se supuso: un barrido de 304
peticiones malformadas contra todos los endpoints de escritura devolvía **90
respuestas 500**, en 23 combinaciones distintas de endpoint y campo. Dos causas:

  1. el **cuerpo entero** no era un objeto JSON (`[]`, `"texto"`, `5`), de modo
     que `request.get_json(...) or {}` devolvía eso y el `.get()` siguiente
     moría en `AttributeError`;
  2. un **campo** traía otro tipo (`{"username": 123}`) y llegaba hasta un
     `.strip()`.

Las dos se cierran en `schemas/shared.py` (`json_body` y `texto`).

Por qué importa más allá de la limpieza: un 500 revela que el servidor no
esperaba esa entrada, y cada uno arrastra un stacktrace a los logs. Un atacante
sin autenticar podía generarlos a voluntad contra el login.

**No se convierten tipos.** `123` no se acepta como `"123"`. Convertir en
silencio es justo lo que deja entrar al dominio un dato con la forma equivocada.
"""

import pytest

# Los tipos que un cliente puede mandar en JSON donde se espera una cadena.
NO_CADENAS = [123, 1.5, True, [], {}, ["x"], {"a": 1}]

# Cuerpos que son JSON válido pero no un objeto.
CUERPOS_NO_OBJETO = [[], ["a"], "texto", 5, 1.5, True]


def _codigos(respuesta) -> set:
    return {e.get("code") for e in respuesta.get_json()["errors"]}


# ---------------------------------------------------------------------------
# Cuerpo entero con la forma equivocada -> 400 controlado
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("cuerpo", CUERPOS_NO_OBJETO)
def test_un_cuerpo_que_no_es_objeto_es_400_no_500(client, cuerpo):
    respuesta = client.post("/api/v1/admin/auth/login", json=cuerpo)

    assert respuesta.status_code == 400
    assert _codigos(respuesta) == {"malformed_request"}


@pytest.mark.parametrize(
    "metodo,ruta",
    [
        ("post", "/api/v1/admin/users"),
        ("put", "/api/v1/admin/users/1"),
        ("post", "/api/v1/admin/brands"),
        ("post", "/api/v1/admin/categories"),
        ("post", "/api/v1/admin/sports"),
        ("post", "/api/v1/admin/promotions"),
        ("post", "/api/v1/admin/products"),
    ],
)
def test_ningun_endpoint_de_escritura_revienta_con_un_cuerpo_no_objeto(client, metodo, ruta):
    """Sin sesión responden 401, que también es un 4xx controlado.

    Lo que se comprueba es que **nunca** sea 5xx: el error de tipo ocurría antes
    o después de la comprobación de sesión según el endpoint.
    """
    for cuerpo in CUERPOS_NO_OBJETO:
        respuesta = getattr(client, metodo)(ruta, json=cuerpo)
        assert respuesta.status_code < 500, f"{metodo} {ruta} con {cuerpo!r}"


# ---------------------------------------------------------------------------
# Campos con el tipo equivocado -> 422 señalando el campo
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("valor", NO_CADENAS)
def test_username_no_cadena_en_el_login_es_422(client, valor):
    """El hallazgo original: `{"username": 123}` devolvía 500."""
    respuesta = client.post("/api/v1/admin/auth/login", json={"username": valor, "password": "x"})

    assert respuesta.status_code == 422
    assert _codigos(respuesta) == {"validation_error"}
    campos = {e.get("field") for e in respuesta.get_json()["errors"]}
    assert "username" in campos


@pytest.mark.parametrize("valor", NO_CADENAS)
def test_password_no_cadena_en_el_login_es_422(client, valor):
    """Nunca puede llegar un no-string a bcrypt."""
    respuesta = client.post("/api/v1/admin/auth/login", json={"username": "x", "password": valor})

    assert respuesta.status_code == 422
    campos = {e.get("field") for e in respuesta.get_json()["errors"]}
    assert "password" in campos


def test_el_tipo_no_se_convierte_en_silencio(client):
    """`123` no se acepta como `"123"`: se rechaza diciendo que debe ser cadena."""
    respuesta = client.post("/api/v1/admin/auth/login", json={"username": 123, "password": "x"})

    detalles = " ".join(e["detail"] for e in respuesta.get_json()["errors"])
    assert "must be a string" in detalles


def test_el_mensaje_no_devuelve_el_valor_rechazado(client):
    """Un eco del valor sería un reflejo de entrada en la respuesta."""
    respuesta = client.post(
        "/api/v1/admin/auth/login",
        json={"username": {"marca": "no-debe-aparecer-en-la-respuesta"}, "password": "x"},
    )

    assert "no-debe-aparecer-en-la-respuesta" not in respuesta.get_data(as_text=True)


# ---------------------------------------------------------------------------
# Lo válido sigue funcionando: el endurecimiento no puede cerrar la puerta
# ---------------------------------------------------------------------------


def test_una_entrada_valida_no_queda_rechazada_por_el_tipo(client):
    """Sin credenciales correctas es 401, no 422: el schema la dejó pasar."""
    respuesta = client.post(
        "/api/v1/admin/auth/login",
        json={"username": "alguien", "password": "una-contrasena-cualquiera"},
    )

    assert respuesta.status_code == 401


def test_un_campo_ausente_sigue_siendo_un_error_de_campo_requerido(client):
    respuesta = client.post("/api/v1/admin/auth/login", json={})

    assert respuesta.status_code == 422
    detalles = " ".join(e["detail"] for e in respuesta.get_json()["errors"])
    assert "required" in detalles


def test_una_cadena_vacia_o_solo_espacios_sigue_siendo_requerido(client):
    respuesta = client.post("/api/v1/admin/auth/login", json={"username": "   ", "password": "x"})

    assert respuesta.status_code == 422
    campos = {e.get("field") for e in respuesta.get_json()["errors"]}
    assert "username" in campos


def test_sin_cuerpo_ninguno_el_error_sigue_siendo_de_campos(client):
    """Un cuerpo ausente no es un 400: faltan campos, que es el error útil."""
    respuesta = client.post("/api/v1/admin/auth/login")

    assert respuesta.status_code == 422


# ---------------------------------------------------------------------------
# El helper compartido, directamente
# ---------------------------------------------------------------------------


def test_texto_rechaza_el_tipo_en_vez_de_convertirlo():
    from app.schemas.shared import texto

    errores: list[dict] = []
    assert texto({"campo": 123}, "campo", errores) == ""
    assert errores and errores[0]["field"] == "campo"
    assert "string" in errores[0]["detail"]


def test_texto_acepta_lo_que_si_es_cadena_y_recorta():
    from app.schemas.shared import texto

    errores: list[dict] = []
    assert texto({"campo": "  hola  "}, "campo", errores) == "hola"
    assert errores == []


def test_texto_respeta_el_maximo():
    from app.schemas.shared import texto

    errores: list[dict] = []
    texto({"campo": "x" * 30}, "campo", errores, maximo=10)
    assert errores and "at most 10" in errores[0]["detail"]


def test_json_body_devuelve_diccionario_vacio_sin_cuerpo(app):
    from app.schemas.shared import json_body

    with app.test_request_context("/x", method="POST"):
        assert json_body() == {}


def test_json_body_rechaza_un_cuerpo_que_no_es_objeto(app):
    from app.core.exceptions import BadRequestError
    from app.schemas.shared import json_body

    with (
        app.test_request_context("/x", method="POST", json=["a", "b"]),
        pytest.raises(BadRequestError),
    ):
        json_body()
