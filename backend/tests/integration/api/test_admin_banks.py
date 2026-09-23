"""Bancos de Superdescuentos del panel.

Mismo criterio de pruebas que `test_admin_banners.py`: la imagen es un
archivo real, y la limpieza retira tanto las filas como los archivos que
dejaron de tener fila (`AD-39`).
"""

import io
import os

import pytest
from sqlalchemy import text

from app.extensions import db
from app.infrastructure.storage.local_storage import (
    BANK_WIDTHS,
    BANKS_NAMESPACE,
    LocalStorage,
)
from tests.fixtures.images import image_bytes

PREFIJO = "bank-test"
CANONICO = 800


def _formulario(sufijo: str = "a", con_imagen: bool = True, **overrides) -> dict:
    datos = {
        "name": f"{PREFIJO}-{sufijo}",
        "discount_percentage": "20",
        "position": "0",
        "is_active": "true",
    }
    datos.update({k: v for k, v in overrides.items() if v is not None})
    for clave, valor in list(overrides.items()):
        if valor is None:
            datos.pop(clave, None)
    if con_imagen:
        datos["image"] = (io.BytesIO(image_bytes(size=(800, 400))), "banco.png")
    return datos


@pytest.fixture
def limpieza(schema_app):
    def limpiar():
        with schema_app.app_context():
            rutas = [
                fila[0]
                for fila in db.session.execute(
                    text("SELECT image_path FROM banks WHERE name LIKE :p"),
                    {"p": f"{PREFIJO}%"},
                )
                if fila[0]
            ]
            db.session.execute(
                text(
                    "DELETE FROM audit_logs WHERE entity_type = 'bank' AND entity_id IN "
                    "(SELECT id FROM banks WHERE name LIKE :p)"
                ),
                {"p": f"{PREFIJO}%"},
            )
            db.session.execute(text("DELETE FROM banks WHERE name LIKE :p"), {"p": f"{PREFIJO}%"})
            db.session.commit()

            storage = LocalStorage()
            for ruta in rutas:
                huella = os.path.basename(ruta).split("-")[0]
                for rama in (storage.derivatives_path, storage.originals_path):
                    carpeta = os.path.join(rama, BANKS_NAMESPACE)
                    if not os.path.isdir(carpeta):
                        continue
                    for nombre in os.listdir(carpeta):
                        if nombre.startswith(huella):
                            os.remove(os.path.join(carpeta, nombre))

    limpiar()
    yield
    limpiar()


@pytest.fixture
def cliente(admin_client, limpieza):
    return admin_client


def _crear(cliente, **kwargs):
    return cliente.post(
        "/api/v1/admin/banks", data=_formulario(**kwargs), content_type="multipart/form-data"
    )


# Contrato y permisos


def test_todas_las_rutas_exigen_sesion(schema_app, limpieza):
    """PA-06."""
    client = schema_app.test_client()
    for metodo, ruta in [
        ("get", "/api/v1/admin/banks"),
        ("post", "/api/v1/admin/banks"),
        ("get", "/api/v1/admin/banks/1"),
        ("put", "/api/v1/admin/banks/1"),
        ("delete", "/api/v1/admin/banks/1"),
    ]:
        assert getattr(client, metodo)(ruta).status_code == 401, ruta


def test_creacion_devuelve_201_y_el_dto_del_contrato(cliente):
    respuesta = _crear(cliente)

    assert respuesta.status_code == 201
    datos = respuesta.get_json()["data"]
    assert set(datos) == {
        "id",
        "name",
        "description",
        "discount_percentage",
        "image_url",
        "position",
        "is_active",
    }
    assert datos["description"] is None


def test_creacion_con_descripcion(cliente):
    respuesta = _crear(cliente, description="Reintegro válido los fines de semana.")

    assert respuesta.status_code == 201
    assert respuesta.get_json()["data"]["description"] == "Reintegro válido los fines de semana."


def test_descripcion_recorta_espacios(cliente):
    respuesta = _crear(cliente, description="  con espacios  ")

    assert respuesta.get_json()["data"]["description"] == "con espacios"


def test_descripcion_demasiado_larga_es_422(cliente):
    respuesta = cliente.post(
        "/api/v1/admin/banks",
        data=_formulario(description="x" * 501),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 422
    assert "description" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_la_descripcion_no_se_expone_en_lo_publico(cliente):
    """La tarjeta pública sigue siendo mínima: nombre, porcentaje, mini banner."""
    _crear(cliente, sufijo="con-nota", description="Nota interna del panel")

    publico = cliente.get("/api/v1/banks").get_json()["data"]
    banco = next(b for b in publico if b["name"] == f"{PREFIJO}-con-nota")

    assert "description" not in banco


def test_el_dto_publico_no_expone_id_ni_estado(cliente):
    """`AD-12`."""
    _crear(cliente, sufijo="publico", position="0")

    publico = cliente.get("/api/v1/banks").get_json()["data"]

    assert publico
    for banco in publico:
        assert set(banco) == {"name", "discount_percentage", "image_url"}
        assert "id" not in banco
        assert "is_active" not in banco
        assert "position" not in banco


# No exponer escritura pública


def test_no_hay_endpoints_publicos_de_escritura(schema_app):
    client = schema_app.test_client()
    assert client.post("/api/v1/banks").status_code in (404, 405)
    assert client.put("/api/v1/banks/1").status_code in (404, 405)
    assert client.delete("/api/v1/banks/1").status_code in (404, 405)


# Imagen (mini banner)


def test_la_imagen_es_obligatoria_al_crear(cliente):
    respuesta = cliente.post(
        "/api/v1/admin/banks",
        data=_formulario(con_imagen=False),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 422
    assert "image" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_la_ruta_publicada_apunta_al_canonico(cliente):
    datos = _crear(cliente).get_json()["data"]

    assert datos["image_url"].startswith(f"/uploads/{BANKS_NAMESPACE}/")
    assert datos["image_url"].endswith(f"-{CANONICO}.webp")


def test_se_generan_los_dos_anchos_de_banco_con_respaldo(schema_app, cliente):
    datos = _crear(cliente).get_json()["data"]
    huella = os.path.basename(datos["image_url"]).split("-")[0]

    with schema_app.app_context():
        carpeta = os.path.join(LocalStorage().derivatives_path, BANKS_NAMESPACE)
        presentes = sorted(f for f in os.listdir(carpeta) if f.startswith(huella))

    esperados = sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in BANK_WIDTHS.values()
        for extension in ("webp", "jpg")
    )
    assert presentes == esperados


# Validaciones


def test_nombre_obligatorio(cliente):
    respuesta = cliente.post(
        "/api/v1/admin/banks", data=_formulario(name=""), content_type="multipart/form-data"
    )

    assert respuesta.status_code == 422
    assert "name" in {e["field"] for e in respuesta.get_json()["errors"]}


@pytest.mark.parametrize("valor", ["0", "100", "-5", "abc", ""])
def test_porcentaje_invalido_es_422(cliente, valor):
    respuesta = cliente.post(
        "/api/v1/admin/banks",
        data=_formulario(discount_percentage=valor),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 422
    assert "discount_percentage" in {e["field"] for e in respuesta.get_json()["errors"]}


@pytest.mark.parametrize("valor", ["1", "20", "50", "99"])
def test_porcentaje_valido_se_acepta(cliente, valor):
    respuesta = cliente.post(
        "/api/v1/admin/banks",
        data=_formulario(discount_percentage=valor),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 201
    assert respuesta.get_json()["data"]["discount_percentage"] == int(valor)


def test_posicion_negativa_es_422(cliente):
    respuesta = cliente.post(
        "/api/v1/admin/banks", data=_formulario(position="-1"), content_type="multipart/form-data"
    )

    assert respuesta.status_code == 422
    assert "position" in {e["field"] for e in respuesta.get_json()["errors"]}


# Orden y visibilidad pública


def test_el_listado_del_panel_ordena_por_posicion(cliente):
    _crear(cliente, sufijo="tercero", position="3")
    _crear(cliente, sufijo="primero", position="1")
    _crear(cliente, sufijo="segundo", position="2")

    listado = cliente.get("/api/v1/admin/banks").get_json()["data"]
    propios = [b for b in listado if b["name"].startswith(PREFIJO)]

    assert [b["name"] for b in propios] == [
        f"{PREFIJO}-primero",
        f"{PREFIJO}-segundo",
        f"{PREFIJO}-tercero",
    ]


def test_el_publico_respeta_el_orden(cliente):
    _crear(cliente, sufijo="z-ultimo", position="9")
    _crear(cliente, sufijo="a-primero", position="1")

    publico = cliente.get("/api/v1/banks").get_json()["data"]
    nombres_propios = [b["name"] for b in publico if b["name"].startswith(PREFIJO)]

    assert nombres_propios == [f"{PREFIJO}-a-primero", f"{PREFIJO}-z-ultimo"]


def test_un_banco_inactivo_no_aparece_en_superdescuentos(cliente):
    _crear(cliente, sufijo="inactivo", is_active="false")

    publico = cliente.get("/api/v1/banks").get_json()["data"]

    assert not any(b["name"] == f"{PREFIJO}-inactivo" for b in publico)


def test_modificar_el_porcentaje_se_refleja_en_lo_publico(cliente):
    creado = _crear(cliente, sufijo="editable", discount_percentage="20").get_json()["data"]

    cliente.put(
        f"/api/v1/admin/banks/{creado['id']}",
        data=_formulario(sufijo="editable", con_imagen=False, discount_percentage="35"),
        content_type="multipart/form-data",
    )

    publico = cliente.get("/api/v1/banks").get_json()["data"]
    banco = next(b for b in publico if b["name"] == f"{PREFIJO}-editable")
    assert banco["discount_percentage"] == 35


# Ciclo de vida


def test_actualizacion_sin_imagen_conserva_la_actual(cliente):
    creado = _crear(cliente).get_json()["data"]

    respuesta = cliente.put(
        f"/api/v1/admin/banks/{creado['id']}",
        data=_formulario(con_imagen=False, name=f"{PREFIJO}-editado"),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 200
    datos = respuesta.get_json()["data"]
    assert datos["name"] == f"{PREFIJO}-editado"
    assert datos["image_url"] == creado["image_url"]


def test_actualizacion_cambia_la_descripcion(cliente):
    creado = _crear(cliente, description="original").get_json()["data"]

    respuesta = cliente.put(
        f"/api/v1/admin/banks/{creado['id']}",
        data=_formulario(con_imagen=False, description="actualizada"),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["description"] == "actualizada"


def test_actualizacion_con_imagen_la_reemplaza(cliente):
    creado = _crear(cliente).get_json()["data"]

    datos = _formulario(con_imagen=False)
    datos["image"] = (io.BytesIO(image_bytes(size=(900, 450))), "otra.png")
    respuesta = cliente.put(
        f"/api/v1/admin/banks/{creado['id']}", data=datos, content_type="multipart/form-data"
    )

    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["image_url"] != creado["image_url"]


def test_borrado_logico(cliente, outside):
    """`AD-18`."""
    creado = _crear(cliente).get_json()["data"]

    respuesta = cliente.delete(f"/api/v1/admin/banks/{creado['id']}")

    assert respuesta.status_code == 200
    with outside.connect() as conexion:
        fila = conexion.execute(
            text("SELECT is_active, deleted_at FROM banks WHERE id = :i"), {"i": creado["id"]}
        ).one()
    assert fila.is_active is False
    assert fila.deleted_at is not None

    assert cliente.get(f"/api/v1/admin/banks/{creado['id']}").status_code == 404
    listado = cliente.get("/api/v1/admin/banks").get_json()["data"]
    assert creado["id"] not in {b["id"] for b in listado}


def test_borrado_retira_el_banco_de_superdescuentos(cliente):
    creado = _crear(cliente, sufijo="a-retirar").get_json()["data"]
    publico_antes = cliente.get("/api/v1/banks").get_json()["data"]
    assert any(b["name"] == f"{PREFIJO}-a-retirar" for b in publico_antes)

    cliente.delete(f"/api/v1/admin/banks/{creado['id']}")

    publico = cliente.get("/api/v1/banks").get_json()["data"]
    assert not any(b["name"] == f"{PREFIJO}-a-retirar" for b in publico)


def test_borrado_retira_el_archivo_si_nadie_mas_lo_usa(schema_app, cliente):
    creado = _crear(cliente, sufijo="solitario").get_json()["data"]
    huella = os.path.basename(creado["image_url"]).split("-")[0]

    cliente.delete(f"/api/v1/admin/banks/{creado['id']}")

    with schema_app.app_context():
        carpeta = os.path.join(LocalStorage().derivatives_path, BANKS_NAMESPACE)
        assert not any(nombre.startswith(huella) for nombre in os.listdir(carpeta))


def test_banco_inexistente_es_404(cliente):
    assert cliente.get("/api/v1/admin/banks/99999999").status_code == 404
    assert cliente.delete("/api/v1/admin/banks/99999999").status_code == 404


def test_el_listado_pagina(cliente):
    for indice in range(3):
        _crear(cliente, sufijo=f"p{indice}", position=str(indice))

    respuesta = cliente.get("/api/v1/admin/banks?per_page=2")

    cuerpo = respuesta.get_json()
    assert len(cuerpo["data"]) == 2
    assert cuerpo["meta"]["per_page"] == 2
    assert cuerpo["meta"]["total"] >= 3


# Auditoría (`AD-20`)


def test_cada_escritura_deja_auditoria(cliente, administrator_id, outside):
    creado = _crear(cliente).get_json()["data"]
    cliente.put(
        f"/api/v1/admin/banks/{creado['id']}",
        data=_formulario(con_imagen=False, is_active="false"),
        content_type="multipart/form-data",
    )
    cliente.delete(f"/api/v1/admin/banks/{creado['id']}")

    with outside.connect() as conexion:
        filas = list(
            conexion.execute(
                text(
                    "SELECT action, administrator_id FROM audit_logs "
                    "WHERE entity_type = 'bank' AND entity_id = :i ORDER BY id"
                ),
                {"i": creado["id"]},
            ).mappings()
        )

    assert [f["action"] for f in filas] == ["create", "deactivate", "delete"]
    assert {f["administrator_id"] for f in filas} == {administrator_id}
