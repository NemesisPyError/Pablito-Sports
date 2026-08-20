"""Sexos y tipos de talle en el panel (05_API.md §9.17, §9.18).

`S-06` y `S-07` los declaran datos semilla **no administrables**. Se exponen al
panel sólo para resolver `gender_id` y `size_type_id`, que `ProductCreateDTO`
exige y la API pública no publica (`AD-12`, §4.8).

Los tests fijan las dos mitades del contrato: que el identificador llega al
panel, y que la API pública **sigue sin exponerlo**.
"""

from uuid import uuid4

import pytest

RUTA_GENDERS = "/api/v1/admin/genders"
RUTA_SIZE_TYPES = "/api/v1/admin/size-types"

CAMPOS_DTO = {"id", "slug", "name"}


def _datos(respuesta):
    assert respuesta.status_code == 200, respuesta.get_json()
    cuerpo = respuesta.get_json()
    assert cuerpo["success"] is True
    return cuerpo["data"]


# Permisos (PA-06)


@pytest.mark.parametrize("ruta", [RUTA_GENDERS, RUTA_SIZE_TYPES])
def test_exigen_sesion(schema_app, ruta):
    assert schema_app.test_client().get(ruta).status_code == 401


# Contrato (§10.7)


@pytest.mark.parametrize("ruta", [RUTA_GENDERS, RUTA_SIZE_TYPES])
def test_devuelven_el_dto_del_contrato(admin_client, ruta):
    datos = _datos(admin_client.get(ruta))

    assert datos, "los datos semilla deben existir tras las migraciones"
    for fila in datos:
        assert set(fila) == CAMPOS_DTO


@pytest.mark.parametrize("ruta", [RUTA_GENDERS, RUTA_SIZE_TYPES])
def test_el_identificador_es_utilizable(admin_client, ruta):
    """Es la razón de existir del endpoint: sin `id` el alta es imposible."""
    for fila in _datos(admin_client.get(ruta)):
        assert isinstance(fila["id"], int)
        assert fila["id"] > 0


@pytest.mark.parametrize("ruta", [RUTA_GENDERS, RUTA_SIZE_TYPES])
def test_responden_paginados(admin_client, ruta):
    """§4.4."""
    meta = admin_client.get(f"{ruta}?page=1&per_page=1").get_json()["meta"]

    assert meta["page"] == 1
    assert meta["per_page"] == 1
    assert meta["total"] >= 1


# Solo lectura (`S-06`, `S-07`)


@pytest.mark.parametrize("ruta", [RUTA_GENDERS, RUTA_SIZE_TYPES])
@pytest.mark.parametrize("metodo", ["post", "put", "delete", "patch"])
def test_no_admiten_escritura(admin_client, ruta, metodo):
    """No son administrables: no debe existir ninguna escritura.

    405 —el método no existe en esa ruta— es la respuesta correcta. Un 200 o un
    422 significaría que alguien añadió una escritura que el documento prohíbe.
    """
    respuesta = getattr(admin_client, metodo)(ruta, json={"name": "X", "slug": "x"})

    assert respuesta.status_code == 405, f"{metodo.upper()} {ruta} no debería existir"


# La API pública no cambia (`AD-12`)


@pytest.mark.parametrize("ruta_publica", ["/api/v1/genders", "/api/v1/size-types"])
def test_la_api_publica_sigue_sin_exponer_el_identificador(schema_app, ruta_publica):
    """`AD-12`: §7.10 y §7.11 publican sólo `slug` y `name`.

    Cliente propio y no `catalog_client`: sexos y tipos de talle llegan por
    migración (`S-06`, `S-07`), así que no hace falta el catálogo, y pedirlo
    aquí adelantaría la construcción de una fixture de sesión que otros módulos
    esperan encontrar intacta.
    """
    for fila in _datos(schema_app.test_client().get(ruta_publica)):
        assert set(fila) == {"slug", "name"}
        assert "id" not in fila


# El hueco que cierran: las altas que estaban bloqueadas


def test_los_identificadores_permiten_crear_un_talle(admin_client):
    """§9.9 exige `size_type_id`, que hasta ahora el panel no podía obtener."""
    tipos = _datos(admin_client.get(RUTA_SIZE_TYPES))
    size_type_id = tipos[0]["id"]

    # Sufijo único y corto: `RN-79` impide reutilizar el slug ni tras el borrado
    # lógico, y §10.13 acota los talles a 20 caracteres.
    sufijo = uuid4().hex[:6]
    respuesta = admin_client.post(
        "/api/v1/admin/sizes",
        json={
            "name": f"t-{sufijo}",
            "slug": f"t-{sufijo}",
            "size_type_id": size_type_id,
        },
    )

    try:
        assert respuesta.status_code == 201, respuesta.get_json()
        assert respuesta.get_json()["data"]["size_type_id"] == size_type_id
    finally:
        if respuesta.status_code == 201:
            admin_client.delete(f"/api/v1/admin/sizes/{respuesta.get_json()['data']['id']}")
