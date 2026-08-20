"""Banners del panel (05_API.md §9.11, `RN-73`, `RN-74`).

Las fechas son fijas y explícitas, nunca `now()`: la vigencia de un banner debe
depender del valor que el test declara, no del instante de ejecución
(11_TESTING.md §9.1).
"""

import os
from datetime import UTC, datetime, timedelta

import pytest
from PIL import Image
from sqlalchemy import text

from app.extensions import db
from app.infrastructure.storage.local_storage import (
    BANNER_WIDTHS,
    BANNERS_NAMESPACE,
    LocalStorage,
)
from tests.fixtures.images import image_bytes

PREFIJO = "banner-test"

# El catálogo público evalúa la vigencia contra el reloj del servidor (`RN-34`),
# que no se puede inyectar por HTTP. Para que los tests no dependan de cuándo se
# ejecuten, las ventanas son **inequívocas**: un pasado que siempre será pasado y
# un futuro que siempre será futuro dentro de la vida del proyecto. Lo que nunca
# se hace es construir la ventana a partir de `now()`.
PASADO_INICIO = datetime(2020, 1, 1, tzinfo=UTC)
PASADO_FIN = datetime(2020, 12, 31, tzinfo=UTC)
FUTURO_INICIO = datetime(2099, 1, 1, tzinfo=UTC)
FUTURO_FIN = datetime(2099, 12, 31, tzinfo=UTC)

# Reloj de referencia para las validaciones de forma, que no consultan al
# catálogo y por tanto no dependen del reloj real.
AHORA = datetime(2026, 6, 15, 12, 0, 0, tzinfo=UTC)
AYER = AHORA - timedelta(days=1)
MANANA = AHORA + timedelta(days=1)

CANONICO = 1600


def _iso(momento: datetime) -> str:
    return momento.isoformat()


def _formulario(sufijo: str = "a", con_imagen: bool = True, **overrides) -> dict:
    import io

    datos = {
        "title": f"{PREFIJO}-{sufijo}",
        "subtitle": "Subtítulo de prueba",
        "link_url": "https://example.test/promo",
        "position": "0",
        # `RN-74`: sin vigencia, permanente mientras esté activo. Es la forma de
        # que el caso base sea visible en el catálogo sin atarse al reloj.
        "is_active": "true",
    }
    datos.update({k: v for k, v in overrides.items() if v is not None})
    for clave, valor in list(overrides.items()):
        if valor is None:
            datos.pop(clave, None)
    if con_imagen:
        datos["image"] = (io.BytesIO(image_bytes(size=(1200, 400))), "banner.png")
    return datos


@pytest.fixture
def limpieza(schema_app):
    def limpiar():
        with schema_app.app_context():
            rutas = [
                fila[0]
                for fila in db.session.execute(
                    text("SELECT image_path FROM banners WHERE title LIKE :p"),
                    {"p": f"{PREFIJO}%"},
                )
                if fila[0]
            ]
            db.session.execute(
                text(
                    "DELETE FROM audit_logs WHERE entity_type = 'banner' AND entity_id IN "
                    "(SELECT id FROM banners WHERE title LIKE :p)"
                ),
                {"p": f"{PREFIJO}%"},
            )
            db.session.execute(
                text("DELETE FROM banners WHERE title LIKE :p"), {"p": f"{PREFIJO}%"}
            )
            db.session.commit()

            # `AD-39`: retirar archivos que ya no tienen fila.
            storage = LocalStorage()
            for ruta in rutas:
                huella = os.path.basename(ruta).split("-")[0]
                for rama in (storage.derivatives_path, storage.originals_path):
                    carpeta = os.path.join(rama, BANNERS_NAMESPACE)
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
        "/api/v1/admin/banners", data=_formulario(**kwargs), content_type="multipart/form-data"
    )


# Contrato y permisos


def test_todas_las_rutas_exigen_sesion(schema_app, limpieza):
    """PA-06."""
    client = schema_app.test_client()
    for metodo, ruta in [
        ("get", "/api/v1/admin/banners"),
        ("post", "/api/v1/admin/banners"),
        ("get", "/api/v1/admin/banners/1"),
        ("put", "/api/v1/admin/banners/1"),
        ("delete", "/api/v1/admin/banners/1"),
    ]:
        assert getattr(client, metodo)(ruta).status_code == 401, ruta


def test_creacion_devuelve_201_y_el_dto_del_contrato(cliente):
    """§10.3 `BannerAdminDTO`: campos exactos, sin marcas de tiempo."""
    respuesta = _crear(cliente)

    assert respuesta.status_code == 201
    datos = respuesta.get_json()["data"]
    assert set(datos) == {
        "id",
        "title",
        "subtitle",
        "image_url",
        "link_url",
        "button_label",
        "placement",
        "position",
        "starts_at",
        "ends_at",
        "is_active",
    }
    assert "created_at" not in datos
    assert "deleted_at" not in datos


def test_el_dto_publico_no_expone_id_ni_estado(cliente):
    """`AD-12`: `BannerDTO` (§10.3) sigue sin `id`, fechas ni estado.

    Desde la v1.1.0 suma `button_label` y `placement`, que son contenido de la
    pieza y no metadatos administrativos.
    """
    _crear(cliente, sufijo="publico", position="0")

    publico = cliente.get("/api/v1/banners").get_json()["data"]

    assert publico
    for banner in publico:
        assert set(banner) == {
            "title",
            "subtitle",
            "image_url",
            "link_url",
            "button_label",
            "placement",
            "position",
        }
        assert "id" not in banner
        assert "is_active" not in banner


# Imagen (§10.13, §17.1)


def test_la_imagen_es_obligatoria_al_crear(cliente):
    """§10.13: `image` es obligatoria en `POST`."""
    respuesta = cliente.post(
        "/api/v1/admin/banners",
        data=_formulario(con_imagen=False),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 422
    assert "image" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_la_ruta_publicada_apunta_al_canonico_de_1600(cliente):
    """§17.1.6: `banners.image_path` guarda el derivado de 1600 px."""
    datos = _crear(cliente).get_json()["data"]

    assert datos["image_url"].startswith(f"/uploads/{BANNERS_NAMESPACE}/")
    assert datos["image_url"].endswith(f"-{CANONICO}.webp")


def test_se_generan_los_tres_anchos_de_banner_con_respaldo(schema_app, cliente):
    """§17.1.2: 800, 1600 y 2400 px, en WebP y JPEG."""
    datos = _crear(cliente).get_json()["data"]
    huella = os.path.basename(datos["image_url"]).split("-")[0]

    with schema_app.app_context():
        carpeta = os.path.join(LocalStorage().derivatives_path, BANNERS_NAMESPACE)
        presentes = sorted(f for f in os.listdir(carpeta) if f.startswith(huella))

    esperados = sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in BANNER_WIDTHS.values()
        for extension in ("webp", "jpg")
    )
    assert presentes == esperados


def test_los_anchos_de_banner_son_los_aprobados(schema_app):
    """§17.1.2: conjunto cerrado."""
    assert BANNER_WIDTHS == {"thumbnail": 800, "standard": 1600, "wide": 2400}


def test_el_original_queda_fuera_de_la_rama_publica(schema_app, cliente):
    """`AD-38`: el original no se sirve nunca."""
    datos = _crear(cliente).get_json()["data"]
    huella = os.path.basename(datos["image_url"]).split("-")[0]

    with schema_app.app_context():
        storage = LocalStorage()
        originales = os.path.join(storage.originals_path, BANNERS_NAMESPACE)
        assert any(f.startswith(huella) for f in os.listdir(originales))
        assert BANNERS_NAMESPACE not in storage.derivatives_path.split(os.sep)[:-1]


def test_una_imagen_mas_estrecha_no_se_amplia(schema_app, cliente):
    import io

    datos = _formulario(sufijo="chica")
    datos["image"] = (io.BytesIO(image_bytes(size=(1000, 500))), "chica.png")
    respuesta = cliente.post(
        "/api/v1/admin/banners", data=datos, content_type="multipart/form-data"
    )
    url = respuesta.get_json()["data"]["image_url"]
    huella = os.path.basename(url).split("-")[0]

    with schema_app.app_context():
        carpeta = os.path.join(LocalStorage().derivatives_path, BANNERS_NAMESPACE)
        with Image.open(os.path.join(carpeta, f"{huella}-2400.webp")) as derivado:
            assert derivado.width == 1000


# Validaciones (§10.13, 04 §9.2.12)


def test_titulo_obligatorio(cliente):
    respuesta = cliente.post(
        "/api/v1/admin/banners", data=_formulario(title=""), content_type="multipart/form-data"
    )

    assert respuesta.status_code == 422
    assert "title" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_posicion_negativa_es_422(cliente):
    """04 §9.2.12: `CHECK (position >= 0)`."""
    respuesta = cliente.post(
        "/api/v1/admin/banners", data=_formulario(position="-1"), content_type="multipart/form-data"
    )

    assert respuesta.status_code == 422
    assert "position" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_ends_at_anterior_a_starts_at_es_422(cliente):
    """04 §9.2.12: `CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)`."""
    respuesta = cliente.post(
        "/api/v1/admin/banners",
        data=_formulario(starts_at=_iso(MANANA), ends_at=_iso(AYER)),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 422
    assert "ends_at" in {e["field"] for e in respuesta.get_json()["errors"]}


def test_sin_vigencia_el_banner_es_permanente(cliente):
    """`RN-74`: sin vigencia definida, permanente mientras esté activo."""
    respuesta = cliente.post(
        "/api/v1/admin/banners",
        data=_formulario(sufijo="permanente"),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 201
    datos = respuesta.get_json()["data"]
    assert datos["starts_at"] is None
    assert datos["ends_at"] is None

    publico = cliente.get("/api/v1/banners").get_json()["data"]
    assert any(b["title"] == f"{PREFIJO}-permanente" for b in publico)


def test_fecha_mal_formada_es_422(cliente):
    respuesta = cliente.post(
        "/api/v1/admin/banners",
        data=_formulario(starts_at="el martes"),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 422


# Orden y vigencia (`RN-73`, `RN-74`)


def test_el_listado_del_panel_ordena_por_posicion(cliente):
    _crear(cliente, sufijo="tercero", position="3")
    _crear(cliente, sufijo="primero", position="1")
    _crear(cliente, sufijo="segundo", position="2")

    listado = cliente.get("/api/v1/admin/banners").get_json()["data"]
    propios = [b for b in listado if b["title"].startswith(PREFIJO)]

    assert [b["position"] for b in propios] == sorted(b["position"] for b in propios)
    assert [b["title"] for b in propios] == [
        f"{PREFIJO}-primero",
        f"{PREFIJO}-segundo",
        f"{PREFIJO}-tercero",
    ]


def test_el_catalogo_publico_respeta_el_orden(cliente):
    _crear(cliente, sufijo="z-ultimo", position="9")
    _crear(cliente, sufijo="a-primero", position="1")

    publico = cliente.get("/api/v1/banners").get_json()["data"]
    posiciones = [b["position"] for b in publico]

    assert posiciones == sorted(posiciones)


def test_un_banner_vencido_no_aparece_en_el_catalogo(cliente):
    """`RN-73`: la vigencia decide qué se muestra."""
    _crear(cliente, sufijo="vencido", starts_at=_iso(PASADO_INICIO), ends_at=_iso(PASADO_FIN))

    publico = cliente.get("/api/v1/banners").get_json()["data"]

    assert not any(b["title"] == f"{PREFIJO}-vencido" for b in publico)


def test_un_banner_futuro_todavia_no_aparece_en_el_catalogo(cliente):
    """`RN-73`: fuera del rango de vigencia no aplica, aunque esté activo."""
    _crear(cliente, sufijo="futuro", starts_at=_iso(FUTURO_INICIO), ends_at=_iso(FUTURO_FIN))

    publico = cliente.get("/api/v1/banners").get_json()["data"]

    assert not any(b["title"] == f"{PREFIJO}-futuro" for b in publico)


def test_un_banner_inactivo_no_aparece_en_el_catalogo(cliente):
    _crear(cliente, sufijo="inactivo", is_active="false")

    publico = cliente.get("/api/v1/banners").get_json()["data"]

    assert not any(b["title"] == f"{PREFIJO}-inactivo" for b in publico)


# Ciclo de vida


def test_actualizacion_sin_imagen_conserva_la_actual(cliente):
    """§10.13: en `PUT` la imagen puede omitirse si no se reemplaza."""
    creado = _crear(cliente).get_json()["data"]

    respuesta = cliente.put(
        f"/api/v1/admin/banners/{creado['id']}",
        data=_formulario(con_imagen=False, title=f"{PREFIJO}-editado"),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 200
    datos = respuesta.get_json()["data"]
    assert datos["title"] == f"{PREFIJO}-editado"
    assert datos["image_url"] == creado["image_url"]


def test_actualizacion_con_imagen_la_reemplaza(cliente):
    import io

    creado = _crear(cliente).get_json()["data"]

    datos = _formulario(con_imagen=False)
    datos["image"] = (io.BytesIO(image_bytes(size=(1800, 600))), "otra.png")
    respuesta = cliente.put(
        f"/api/v1/admin/banners/{creado['id']}", data=datos, content_type="multipart/form-data"
    )

    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["image_url"] != creado["image_url"]


def test_borrado_logico(cliente, outside):
    """`AD-18`."""
    creado = _crear(cliente).get_json()["data"]

    respuesta = cliente.delete(f"/api/v1/admin/banners/{creado['id']}")

    assert respuesta.status_code == 200
    with outside.connect() as conexion:
        fila = conexion.execute(
            text("SELECT is_active, deleted_at FROM banners WHERE id = :i"), {"i": creado["id"]}
        ).one()
    assert fila.is_active is False
    assert fila.deleted_at is not None

    assert cliente.get(f"/api/v1/admin/banners/{creado['id']}").status_code == 404
    listado = cliente.get("/api/v1/admin/banners").get_json()["data"]
    assert creado["id"] not in {b["id"] for b in listado}


def test_banner_inexistente_es_404(cliente):
    assert cliente.get("/api/v1/admin/banners/99999999").status_code == 404
    assert cliente.delete("/api/v1/admin/banners/99999999").status_code == 404


def test_el_listado_pagina(cliente):
    for indice in range(3):
        _crear(cliente, sufijo=f"p{indice}", position=str(indice))

    respuesta = cliente.get("/api/v1/admin/banners?per_page=2")

    cuerpo = respuesta.get_json()
    assert len(cuerpo["data"]) == 2
    assert cuerpo["meta"]["per_page"] == 2
    assert cuerpo["meta"]["total"] >= 3


# Auditoría (`AD-20`)


def test_cada_escritura_deja_auditoria(cliente, administrator_id, outside):
    creado = _crear(cliente).get_json()["data"]
    cliente.put(
        f"/api/v1/admin/banners/{creado['id']}",
        data=_formulario(con_imagen=False, is_active="false"),
        content_type="multipart/form-data",
    )
    cliente.delete(f"/api/v1/admin/banners/{creado['id']}")

    with outside.connect() as conexion:
        filas = list(
            conexion.execute(
                text(
                    "SELECT action, administrator_id FROM audit_logs "
                    "WHERE entity_type = 'banner' AND entity_id = :i ORDER BY id"
                ),
                {"i": creado["id"]},
            ).mappings()
        )

    assert [f["action"] for f in filas] == ["create", "deactivate", "delete"]
    assert {f["administrator_id"] for f in filas} == {administrator_id}


def test_fallo_de_auditoria_revierte_la_creacion(cliente, outside, monkeypatch):
    """`CONS-05`."""
    from app.core.audit import AuditService

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    respuesta = _crear(cliente)

    assert respuesta.status_code == 500
    with outside.connect() as conexion:
        existentes = conexion.execute(
            text("SELECT count(*) FROM banners WHERE title = :t"), {"t": f"{PREFIJO}-a"}
        ).scalar_one()
    assert existentes == 0
