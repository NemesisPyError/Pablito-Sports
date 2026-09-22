"""Contrato de salida de las clasificaciones administrativas (05_API.md §10.7).

§10.7 `CategoryAdminDTO` documenta `created_at` y `updated_at`. Estos tests los
fijan, y fijan también lo que **no** debe ocurrir: que esas marcas contaminen el
snapshot de `audit_logs`.

`updated_at` cambia en toda escritura. Si entrara en el snapshot, cada entrada
de auditoría mostraría una diferencia que el administrador no decidió, y el
historial dejaría de servir para saber qué se cambió (§14.2).

Cada test crea y retira sus propias filas: sólo sexos y tipos de talle llegan
por migración (`S-06`, `S-07`); marcas, categorías, deportes y talles los
siembra la fixture del catálogo, que no es de este módulo.
"""

from uuid import uuid4

import pytest
from sqlalchemy import text

from app.extensions import db

CAMPOS_BASE = {"id", "name", "slug", "is_active", "created_at", "updated_at", "deleted_at"}

PREFIJO = "ct"


@pytest.fixture(autouse=True)
def _sin_residuo_de_talles(schema_app):
    """Retira los talles que crea este módulo (S-13).

    La unicidad de `sizes` es `(name, size_type_id)`, **no** el slug: aunque cada
    prueba genera un slug aleatorio, el `name` es fijo (`42`, `XL`, `Único`). Sin
    esta limpieza el módulo pasa la primera vez y falla en todas las siguientes
    con una violación de unicidad que se manifiesta como un 500 —lo que hace que
    la suite completa no sea repetible—. Defecto de aislamiento anterior a S-13,
    detectado al reejecutar la suite varias veces seguidas.
    """
    yield
    with schema_app.app_context():
        db.session.execute(text(f"DELETE FROM sizes WHERE slug LIKE '{PREFIJO}-%'"))
        db.session.commit()

# §10.13 y 04 §9.2. Un valor por encima debe ser `422`, no `500`.
MAXIMOS = {"brands": 100, "categories": 100, "sports": 100, "sizes": 20}


def _datos(respuesta, esperado: int = 200):
    assert respuesta.status_code == esperado, respuesta.get_json()
    return respuesta.get_json()["data"]


def _size_type_id(admin_client) -> int:
    """§9.18. Sin este endpoint no se podía crear un talle."""
    return _datos(admin_client.get("/api/v1/admin/size-types"))[0]["id"]


def _size_type_id_por_slug(admin_client, slug: str) -> int:
    tipos = _datos(admin_client.get("/api/v1/admin/size-types"))
    return next(t["id"] for t in tipos if t["slug"] == slug)


@pytest.fixture
def recursos(admin_client):
    """Crea una fila de cada clasificación y la retira al terminar.

    El slug lleva un sufijo único porque `AD-19` y `RN-79` impiden reutilizarlo
    **incluso tras el borrado lógico**: la fila sigue ahí, marcada. Repetir el
    slug entre tests daría `409`.
    """
    creados: list[tuple[str, int]] = []

    def crear(recurso: str, **extra) -> dict:
        # Corto a propósito: §10.13 acota los talles a 20 caracteres, que es el
        # más estrecho de las cinco clasificaciones.
        sufijo = uuid4().hex[:6]
        cuerpo = {
            "name": f"{PREFIJO}-{sufijo}",
            "slug": f"{PREFIJO}-{sufijo}",
            **extra,
        }
        dato = _datos(admin_client.post(f"/api/v1/admin/{recurso}", json=cuerpo), esperado=201)
        creados.append((recurso, dato["id"]))
        return dato

    yield crear

    for recurso, identificador in reversed(creados):
        admin_client.delete(f"/api/v1/admin/{recurso}/{identificador}")


# Contrato de salida (§10.7)


def test_marcas_deportes_y_categorias_devuelven_los_campos_del_contrato(recursos):
    # §9.6 (v1.1.0): la marca suma sus campos de portada. El resto de las
    # clasificaciones no los tiene: no son piezas de la Home.
    assert set(recursos("brands")) == CAMPOS_BASE | {
        "image_url",
        "tagline",
        "home_position",
        "show_in_strip",
    }
    assert set(recursos("sports")) == CAMPOS_BASE
    # RN-83 (v2.10.0): la categoría es la única que declara sexos.
    assert set(recursos("categories")) == CAMPOS_BASE | {"parent_id", "gender_ids"}


def test_la_marca_nace_dentro_de_la_franja(recursos):
    """La franja mostraba todas las marcas activas antes de existir el campo.

    Que el defecto sea `True` es lo que hace que agregar la opción no vacíe la
    franja ni obligue a tildar algo en cada alta para conservar lo de siempre.
    """
    assert recursos("brands")["show_in_strip"] is True


def test_la_marca_puede_quedar_fuera_de_la_franja(recursos):
    assert recursos("brands", show_in_strip=False)["show_in_strip"] is False


def test_la_franja_es_independiente_del_bloque_de_portada(recursos):
    """`show_in_strip` y `home_position` deciden cosas distintas.

    Una marca puede estar en la franja sin tener bloque propio con collage en la
    portada (§7.2c), que es justamente el estado de todas las marcas de hoy.
    """
    marca = recursos("brands", show_in_strip=True)

    assert marca["home_position"] is None
    assert marca["show_in_strip"] is True


def test_talles_añaden_su_tipo(admin_client, recursos):
    dato = recursos("sizes", size_type_id=_size_type_id(admin_client))

    assert set(dato) == CAMPOS_BASE | {"size_type_id", "size_type"}


# El talle es texto libre, sin restricción de formato por tipo (RN-15b, v1.5.0)


@pytest.mark.parametrize(
    ("etiqueta", "nombre"),
    [
        ("num", "42"),
        ("dec", "8.5"),
        ("alfa", "XL"),
        ("alfanum", "4T"),
        ("alfanum2", "12Y"),
        ("barra", "35/36"),
        ("guion", "38-39"),
        ("unico", "Único"),
    ],
)
@pytest.mark.parametrize(
    ("tipo_corto", "slug_tipo"),
    [("fw", "footwear_numeric"), ("ap", "apparel_alpha"), ("os", "one_size")],
)
def test_talle_acepta_cualquier_formato_en_cualquier_tipo(
    admin_client, etiqueta, nombre, tipo_corto, slug_tipo
):
    tipo = _size_type_id_por_slug(admin_client, slug_tipo)
    sufijo = uuid4().hex[:4]
    slug = f"{PREFIJO}-{tipo_corto}-{etiqueta}-{sufijo}"

    respuesta = admin_client.post(
        "/api/v1/admin/sizes",
        json={"name": nombre, "slug": slug, "size_type_id": tipo},
    )

    assert respuesta.status_code == 201, respuesta.get_json()
    assert respuesta.get_json()["data"]["name"] == nombre
    admin_client.delete(f"/api/v1/admin/sizes/{respuesta.get_json()['data']['id']}")


def test_talle_rechaza_nombre_vacio_o_solo_espacios(admin_client):
    tipo = _size_type_id_por_slug(admin_client, "footwear_numeric")
    sufijo = uuid4().hex[:6]

    respuesta = admin_client.post(
        "/api/v1/admin/sizes",
        json={"name": "   ", "slug": f"{PREFIJO}-vacio-{sufijo}", "size_type_id": tipo},
    )

    assert respuesta.status_code == 422
    assert respuesta.get_json()["errors"][0]["field"] == "name"


def test_talle_conserva_espacios_internos_pero_recorta_extremos(admin_client):
    tipo = _size_type_id_por_slug(admin_client, "apparel_alpha")
    sufijo = uuid4().hex[:6]

    respuesta = admin_client.post(
        "/api/v1/admin/sizes",
        json={"name": "  Único  ", "slug": f"{PREFIJO}-trim-{sufijo}", "size_type_id": tipo},
    )

    assert respuesta.status_code == 201, respuesta.get_json()
    assert respuesta.get_json()["data"]["name"] == "Único"
    admin_client.delete(f"/api/v1/admin/sizes/{respuesta.get_json()['data']['id']}")


def test_editar_un_talle_a_un_formato_alfanumerico(admin_client):
    tipo = _size_type_id_por_slug(admin_client, "footwear_numeric")
    sufijo = uuid4().hex[:6]

    creado = admin_client.post(
        "/api/v1/admin/sizes",
        json={"name": "42", "slug": f"{PREFIJO}-edit-{sufijo}", "size_type_id": tipo},
    )
    assert creado.status_code == 201, creado.get_json()
    id_talle = creado.get_json()["data"]["id"]

    editado = admin_client.put(
        f"/api/v1/admin/sizes/{id_talle}",
        json={"name": "42.5", "slug": f"{PREFIJO}-edit-{sufijo}", "size_type_id": tipo},
    )

    assert editado.status_code == 200, editado.get_json()
    assert editado.get_json()["data"]["name"] == "42.5"
    admin_client.delete(f"/api/v1/admin/sizes/{id_talle}")


def test_las_marcas_de_tiempo_son_iso(recursos):
    """§10.7 las declara `string`; `AD-34` fija instantes absolutos."""
    dato = recursos("brands")

    for campo in ("created_at", "updated_at"):
        assert isinstance(dato[campo], str)
        assert dato[campo][4] == "-" and dato[campo][7] == "-"


def test_el_detalle_devuelve_el_mismo_contrato_que_el_alta(admin_client, recursos):
    creado = recursos("brands")

    detalle = _datos(admin_client.get(f"/api/v1/admin/brands/{creado['id']}"))

    assert set(detalle) == set(creado)


def test_el_listado_devuelve_el_mismo_contrato_que_el_detalle(admin_client, recursos):
    creado = recursos("brands")

    listado = _datos(admin_client.get("/api/v1/admin/brands"))
    fila = next(item for item in listado if item["id"] == creado["id"])

    assert set(fila) == set(creado)


# Auditoría (§14.2)


def test_la_auditoria_no_registra_las_marcas_de_tiempo(schema_app, recursos):
    """El snapshot es selectivo y omite lo que mantiene la base."""
    creado = recursos("brands")

    with schema_app.app_context():
        valores = db.session.execute(
            text(
                "SELECT new_values FROM audit_logs WHERE entity_type = 'brand' "
                "AND entity_id = :i ORDER BY id DESC LIMIT 1"
            ),
            {"i": creado["id"]},
        ).scalar_one()

    assert "created_at" not in valores
    assert "updated_at" not in valores
    # Lo que sí describe la entidad debe seguir estando.
    assert valores["slug"] == creado["slug"]


def test_una_edicion_no_produce_una_diferencia_falsa(admin_client, schema_app, recursos):
    """Editar sólo el nombre no debe verse como si también cambiara la fecha."""
    creado = recursos("brands")

    admin_client.put(
        f"/api/v1/admin/brands/{creado['id']}",
        json={"name": "Marca editada", "slug": creado["slug"]},
    )

    with schema_app.app_context():
        fila = db.session.execute(
            text(
                "SELECT old_values, new_values FROM audit_logs WHERE entity_type = 'brand' "
                "AND entity_id = :i AND action = 'update' ORDER BY id DESC LIMIT 1"
            ),
            {"i": creado["id"]},
        ).one()

    diferencias = {
        clave
        for clave in fila.new_values
        if fila.old_values.get(clave) != fila.new_values.get(clave)
    }
    assert diferencias == {"name"}, f"cambios espurios en la auditoría: {diferencias}"


# Longitud máxima (§10.13) — regresión


@pytest.mark.parametrize("recurso,maximo", MAXIMOS.items())
def test_un_nombre_demasiado_largo_es_422_y_no_500(admin_client, recurso, maximo):
    """§11: un payload que no cumple el esquema es `422`.

    Regresión: sin validar la longitud, el valor llegaba a PostgreSQL y el error
    de columna se traducía en un `500` opaco. El cliente no podía saber qué
    había hecho mal, y §11 reserva el `500` para fallos técnicos.
    """
    respuesta = admin_client.post(
        f"/api/v1/admin/{recurso}",
        json={"name": "x" * (maximo + 1), "slug": f"ct-largo-{recurso}"[:20]},
    )

    assert respuesta.status_code == 422, respuesta.get_json()
    campos = [error["field"] for error in respuesta.get_json()["errors"]]
    assert "name" in campos


@pytest.mark.parametrize("recurso,maximo", MAXIMOS.items())
def test_un_slug_demasiado_largo_es_422_y_no_500(admin_client, recurso, maximo):
    respuesta = admin_client.post(
        f"/api/v1/admin/{recurso}",
        json={"name": "Valido", "slug": "x" * (maximo + 1)},
    )

    assert respuesta.status_code == 422, respuesta.get_json()
    campos = [error["field"] for error in respuesta.get_json()["errors"]]
    assert "slug" in campos
