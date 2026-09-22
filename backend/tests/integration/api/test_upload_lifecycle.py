"""Ciclo de vida de los archivos subidos (S-13, hallazgo abierto en S-09).

**El problema que corrige.** `delete_image` era un borrado puramente lógico:
marcaba `is_active = False` y `deleted_at`, y **no tocaba el disco**. El derivado
seguía siendo descargable por su URL para siempre, aunque el administrador
hubiera decidido retirarlo. Y como `/uploads/` se sirve con
`Cache-Control: public, max-age=31536000, immutable` (S-09), una caché compartida
podía seguir entregándolo un año más.

**Por qué es un problema de seguridad y no sólo de almacenamiento.** La URL lleva
16 hexadecimales de huella del contenido, así que no es adivinable ni
enumerable: es *no listada*, no protegida. Pero cualquiera que la haya visto
mientras el producto estaba publicado la conserva, y borrar una imagen es
exactamente la acción con la que un administrador expresa «esto ya no debe ser
público». Que no lo sea es un fallo de esa expectativa, no una cuestión de
espacio en disco.

**Cómo se corrige, y por qué en ese orden.** El alta escribe el archivo antes que
la fila (`AD-40`). La baja va al revés: primero confirma la transacción, después
desenlaza. Si se hiciera al revés y la transacción fallara, quedaría una fila
viva apuntando a un archivo inexistente —una imagen rota en el catálogo—. Con
este orden, el peor caso es un archivo huérfano: invisible, sin fila que lo
referencie, y registrado en el log.
"""

import os

import pytest
from PIL import Image
from sqlalchemy import text

from app.extensions import db
from app.infrastructure.storage.local_storage import LocalStorage
from tests.fixtures.images import upload

SKU = "LIFECYCLE-SKU-001"


@pytest.fixture
def catalogo(schema_app):
    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM images WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'LIFECYCLE-SKU%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM product_genders WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'LIFECYCLE-SKU%')"
            )
        )
        db.session.execute(text("DELETE FROM products WHERE sku LIKE 'LIFECYCLE-SKU%'"))
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'lifecycle-%'"))
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'lifecycle-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text(
                "INSERT INTO brands (name, slug, is_active) "
                "VALUES ('Lifecycle', 'lifecycle-marca', true)"
            )
        )
        db.session.execute(
            text(
                "INSERT INTO categories (name, slug, is_active) "
                "VALUES ('Lifecycle', 'lifecycle-cat', true)"
            )
        )
        db.session.commit()
        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = 'lifecycle-marca') AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = 'lifecycle-cat') AS category_id, "
                    "(SELECT id FROM genders LIMIT 1) AS gender_id, "
                    "(SELECT id FROM size_types LIMIT 1) AS size_type_id"
                )
            )
            .mappings()
            .one()
        )
        try:
            yield dict(referencias)
        finally:
            limpiar()


@pytest.fixture
def producto_id(admin_client, catalogo, schema_app):
    respuesta = admin_client.post(
        "/api/v1/admin/products",
        json={
            "name": "Producto ciclo de vida",
            "sku": SKU,
            "list_price": 100000,
            "primary_category_id": catalogo["category_id"],
            "brand_id": catalogo["brand_id"],
            "gender_ids": [catalogo["gender_id"]],
            "size_type_id": catalogo["size_type_id"],
        },
    )
    identificador = respuesta.get_json()["data"]["id"]
    yield identificador
    with schema_app.app_context():
        LocalStorage().purge_product(identificador)


def _subir(admin_client, producto_id, contenido=None, nombre="foto.png"):
    return admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=upload(nombre=nombre, contenido=contenido),
        content_type="multipart/form-data",
    )


def _otra_imagen(color) -> bytes:
    import io as _io

    buffer = _io.BytesIO()
    Image.new("RGB", (900, 700), color).save(buffer, format="PNG")
    return buffer.getvalue()


def _archivos_de(schema_app, ruta_canonica: str) -> int:
    """Cuántos archivos quedan en disco para esa huella (derivados + original)."""
    with schema_app.app_context():
        almacen = LocalStorage()
    carpeta, _, archivo = ruta_canonica.lstrip("/").replace("uploads/", "", 1).rpartition("/")
    huella = archivo.partition("-")[0]
    total = 0
    for rama in (almacen.derivatives_path, almacen.originals_path):
        directorio = os.path.join(rama, carpeta)
        if not os.path.isdir(directorio):
            continue
        total += sum(1 for n in os.listdir(directorio) if n.startswith(huella))
    return total


# ---------------------------------------------------------------------------
# Archivo activo
# ---------------------------------------------------------------------------


def test_una_imagen_activa_conserva_sus_archivos(admin_client, producto_id, schema_app):
    respuesta = _subir(admin_client, producto_id, contenido=_otra_imagen((10, 90, 200)))
    assert respuesta.status_code == 201

    ruta = respuesta.get_json()["data"]["image_url"]
    # Tres anchos x dos formatos, mas el original.
    assert _archivos_de(schema_app, ruta) == 7


# ---------------------------------------------------------------------------
# Borrado: el archivo deja de existir
# ---------------------------------------------------------------------------


def test_al_borrar_una_imagen_sus_archivos_se_retiran_del_disco(
    admin_client, producto_id, schema_app
):
    """La corrección del hallazgo. Antes quedaban en disco indefinidamente."""
    creada = _subir(admin_client, producto_id, contenido=_otra_imagen((200, 30, 30)))
    imagen_id = creada.get_json()["data"]["id"]
    ruta = creada.get_json()["data"]["image_url"]
    assert _archivos_de(schema_app, ruta) == 7

    borrado = admin_client.delete(f"/api/v1/admin/products/{producto_id}/images/{imagen_id}")

    assert borrado.status_code == 200
    assert _archivos_de(schema_app, ruta) == 0


def test_la_fila_queda_con_borrado_logico_no_se_borra_fisicamente(
    admin_client, producto_id, schema_app
):
    """`AD-18` sigue valiendo: la fila persiste, sólo desaparece el archivo."""
    creada = _subir(admin_client, producto_id, contenido=_otra_imagen((30, 200, 90)))
    imagen_id = creada.get_json()["data"]["id"]
    admin_client.delete(f"/api/v1/admin/products/{producto_id}/images/{imagen_id}")

    with schema_app.app_context():
        fila = (
            db.session.execute(
                text("SELECT is_active, deleted_at FROM images WHERE id = :i"), {"i": imagen_id}
            )
            .mappings()
            .one_or_none()
        )

    assert fila is not None, "la fila no debe borrarse físicamente"
    assert fila["is_active"] is False
    assert fila["deleted_at"] is not None


def test_la_imagen_borrada_ya_no_aparece_en_el_producto(admin_client, producto_id):
    creada = _subir(admin_client, producto_id, contenido=_otra_imagen((120, 60, 200)))
    imagen_id = creada.get_json()["data"]["id"]
    admin_client.delete(f"/api/v1/admin/products/{producto_id}/images/{imagen_id}")

    detalle = admin_client.get(f"/api/v1/admin/products/{producto_id}")
    identificadores = [im["id"] for im in detalle.get_json()["data"].get("images", [])]

    assert imagen_id not in identificadores


# ---------------------------------------------------------------------------
# Referencias compartidas: el caso que hace peligroso un borrado ingenuo
# ---------------------------------------------------------------------------


def test_no_se_borra_un_archivo_que_otra_fila_viva_sigue_usando(
    admin_client, producto_id, schema_app
):
    """Dos altas del MISMO archivo comparten huella y, por tanto, ruta.

    Borrar una fila no puede llevarse el archivo mientras la otra lo referencie:
    dejaría una imagen rota en el catálogo.
    """
    contenido = _otra_imagen((7, 7, 7))
    primera = _subir(admin_client, producto_id, contenido=contenido)
    segunda = _subir(admin_client, producto_id, contenido=contenido)
    assert primera.status_code == 201 and segunda.status_code == 201

    ruta_1 = primera.get_json()["data"]["image_url"]
    ruta_2 = segunda.get_json()["data"]["image_url"]
    assert ruta_1 == ruta_2, "el mismo contenido debe producir la misma huella"

    admin_client.delete(
        f"/api/v1/admin/products/{producto_id}/images/{primera.get_json()['data']['id']}"
    )

    # La segunda sigue viva: los archivos NO se tocan.
    assert _archivos_de(schema_app, ruta_2) == 7

    # Al borrar también la segunda, ya no queda referencia y sí se retiran.
    admin_client.delete(
        f"/api/v1/admin/products/{producto_id}/images/{segunda.get_json()['data']['id']}"
    )
    assert _archivos_de(schema_app, ruta_2) == 0


# ---------------------------------------------------------------------------
# Reemplazo: subir otra imagen no toca la anterior
# ---------------------------------------------------------------------------


def test_subir_una_imagen_nueva_no_afecta_a_las_anteriores(admin_client, producto_id, schema_app):
    primera = _subir(admin_client, producto_id, contenido=_otra_imagen((1, 2, 3)))
    ruta_1 = primera.get_json()["data"]["image_url"]
    segunda = _subir(admin_client, producto_id, contenido=_otra_imagen((250, 250, 10)))
    ruta_2 = segunda.get_json()["data"]["image_url"]

    assert ruta_1 != ruta_2
    assert _archivos_de(schema_app, ruta_1) == 7
    assert _archivos_de(schema_app, ruta_2) == 7


# ---------------------------------------------------------------------------
# Errores durante el cleanup: no pueden deshacer una operación confirmada
# ---------------------------------------------------------------------------


def test_un_fallo_al_borrar_el_archivo_no_rompe_la_peticion(
    admin_client, producto_id, schema_app, monkeypatch
):
    """El archivo queda huérfano y registrado; la respuesta sigue siendo 200.

    Es la decisión deliberada del orden: la transacción ya se confirmó, así que
    un fallo del sistema de archivos no puede revertirla.
    """
    creada = _subir(admin_client, producto_id, contenido=_otra_imagen((44, 44, 44)))
    imagen_id = creada.get_json()["data"]["id"]

    def explotar(self, canonical_path):
        raise OSError("disco de sólo lectura")

    monkeypatch.setattr(LocalStorage, "delete_derivative_set", explotar)
    respuesta = admin_client.delete(f"/api/v1/admin/products/{producto_id}/images/{imagen_id}")

    assert respuesta.status_code == 200
    with schema_app.app_context():
        fila = (
            db.session.execute(
                text("SELECT deleted_at FROM images WHERE id = :i"), {"i": imagen_id}
            )
            .mappings()
            .one()
        )
    assert fila["deleted_at"] is not None, "el borrado lógico sí debe haber quedado"


def test_una_ruta_inesperada_no_borra_nada(schema_app):
    """Defensa del propio almacén: si la ruta no tiene la forma esperada, no actúa."""
    with schema_app.app_context():
        almacen = LocalStorage()
        assert almacen.delete_derivative_set("") == 0
        assert almacen.delete_derivative_set("sin-carpeta") == 0


# ---------------------------------------------------------------------------
# El archivo huérfano: qué queda y qué no
# ---------------------------------------------------------------------------


def test_un_archivo_sin_fila_no_es_alcanzable_por_el_catalogo(
    admin_client, producto_id, schema_app
):
    """Un huérfano no aparece en ninguna respuesta de la API.

    Sigue siendo servible por Nginx si alguien conserva la URL —Nginx lee el
    disco, no la base—, y por eso el objetivo es que no se generen.
    """
    creada = _subir(admin_client, producto_id, contenido=_otra_imagen((99, 11, 55)))
    imagen_id = creada.get_json()["data"]["id"]
    ruta = creada.get_json()["data"]["image_url"]
    admin_client.delete(f"/api/v1/admin/products/{producto_id}/images/{imagen_id}")

    publico = admin_client.get(f"/api/v1/admin/products/{producto_id}")
    assert ruta not in publico.get_data(as_text=True)
    assert _archivos_de(schema_app, ruta) == 0
