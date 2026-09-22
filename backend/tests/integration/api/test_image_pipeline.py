"""Pipeline de imágenes (02_ARQUITECTURA.md §15, 03_SEGURIDAD.md §11).

Comprueba la estructura en disco, no solo la respuesta: el contrato de `AD-38`
es *dónde* acaba cada archivo y cuál de ellos tiene ruta pública.
"""

import io
import os

import pytest
from PIL import Image, ImageDraw
from sqlalchemy import text

from app.extensions import db
from app.infrastructure.storage.local_storage import (
    CANONICAL_DERIVATIVE,
    DERIVATIVE_WIDTHS,
    PRODUCTS_NAMESPACE,
    LocalStorage,
)
from tests.fixtures.images import image_bytes, upload

SKU = "IMG-SKU-001"


@pytest.fixture
def catalogo(schema_app):
    def limpiar():
        # v1.2.0: el slug lo deriva el backend de `name` y ya no es un valor
        # fijo que la prueba controle, así que el producto se identifica por
        # `sku`, no por `slug`.
        db.session.execute(
            text(
                "DELETE FROM images WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'IMG-SKU%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM product_genders WHERE product_id IN "
                "(SELECT id FROM products WHERE sku LIKE 'IMG-SKU%')"
            )
        )
        db.session.execute(text("DELETE FROM products WHERE sku LIKE 'IMG-SKU%'"))
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'img-%'"))
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'img-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        db.session.execute(
            text("INSERT INTO brands (name, slug, is_active) VALUES ('Img', 'img-marca', true)")
        )
        db.session.execute(
            text("INSERT INTO categories (name, slug, is_active) VALUES ('Img', 'img-cat', true)")
        )
        db.session.commit()
        referencias = (
            db.session.execute(
                text(
                    "SELECT (SELECT id FROM brands WHERE slug = 'img-marca') AS brand_id, "
                    "(SELECT id FROM categories WHERE slug = 'img-cat') AS category_id, "
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
    response = admin_client.post(
        "/api/v1/admin/products",
        json={
            "name": "Producto imagenes",
            "sku": SKU,
            "list_price": 100000,
            "primary_category_id": catalogo["category_id"],
            "brand_id": catalogo["brand_id"],
            "gender_ids": [catalogo["gender_id"]],
            "size_type_id": catalogo["size_type_id"],
        },
    )
    identifier = response.get_json()["data"]["id"]
    yield identifier
    with schema_app.app_context():
        LocalStorage().purge_product(identifier)


def _subir(admin_client, producto_id, contenido=None, nombre="foto.png"):
    return admin_client.post(
        f"/api/v1/admin/products/{producto_id}/images",
        data=upload(nombre=nombre, contenido=contenido),
        content_type="multipart/form-data",
    )


def test_la_ruta_publicada_apunta_al_derivado_canonico(admin_client, producto_id):
    """§15.2: lo que viaja a `images.file_path` vive en la rama de derivados."""
    response = _subir(admin_client, producto_id, image_bytes(size=(2000, 1000)))

    assert response.status_code == 201
    url = response.get_json()["data"]["image_url"]
    ancho = DERIVATIVE_WIDTHS[CANONICAL_DERIVATIVE]
    assert url.startswith(f"/uploads/{PRODUCTS_NAMESPACE}/{producto_id}/")
    assert url.endswith(f"-{ancho}.webp")


def test_los_anchos_son_los_aprobados_en_ai_06(schema_app):
    """§17.1.1: 400 Miniatura, 800 Catálogo, 1600 Detalle. Conjunto cerrado."""
    assert DERIVATIVE_WIDTHS == {"thumbnail": 400, "catalog": 800, "detail": 1600}
    assert CANONICAL_DERIVATIVE == "catalog"


def test_se_generan_los_tres_tamanos_con_su_respaldo(schema_app, admin_client, producto_id):
    """§17.1.1 y §17.1.2: tres anchos, WebP más respaldo JPEG."""
    _subir(admin_client, producto_id, image_bytes(size=(2000, 1000)))

    with schema_app.app_context():
        storage = LocalStorage()
        derivados = sorted(
            os.listdir(os.path.join(storage.derivatives_path, PRODUCTS_NAMESPACE, str(producto_id)))
        )

    huella = derivados[0].split("-")[0]
    esperados = sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in DERIVATIVE_WIDTHS.values()
        for extension in ("webp", "jpg")
    )
    assert derivados == esperados


def test_los_derivados_respetan_el_ancho_y_la_proporcion(schema_app, admin_client, producto_id):
    """La altura es proporcional: no se recorta el encuadre de quien cargó."""
    _subir(admin_client, producto_id, image_bytes(size=(2000, 1000)))

    with schema_app.app_context():
        storage = LocalStorage()
        carpeta = os.path.join(storage.derivatives_path, PRODUCTS_NAMESPACE, str(producto_id))
        for ancho in DERIVATIVE_WIDTHS.values():
            archivo = next(f for f in os.listdir(carpeta) if f.endswith(f"-{ancho}.webp"))
            with Image.open(os.path.join(carpeta, archivo)) as derivado:
                assert derivado.width == ancho
                assert derivado.height == ancho // 2


def test_una_imagen_mas_estrecha_que_el_objetivo_no_se_amplia(
    schema_app, admin_client, producto_id
):
    """Agrandar no añade información; solo peso."""
    _subir(admin_client, producto_id, image_bytes(size=(500, 500)))

    with schema_app.app_context():
        storage = LocalStorage()
        carpeta = os.path.join(storage.derivatives_path, PRODUCTS_NAMESPACE, str(producto_id))
        archivo = next(f for f in os.listdir(carpeta) if f.endswith("-1600.webp"))
        with Image.open(os.path.join(carpeta, archivo)) as derivado:
            assert derivado.width == 500


def test_el_original_se_conserva_sin_alterar_y_fuera_de_la_rama_publica(
    schema_app, admin_client, producto_id
):
    """AD-38: el original es irreproducible y no se sirve nunca."""
    contenido = image_bytes(size=(1000, 800))
    _subir(admin_client, producto_id, contenido)

    with schema_app.app_context():
        storage = LocalStorage()
        carpeta = os.path.join(storage.originals_path, PRODUCTS_NAMESPACE, str(producto_id))
        archivos = os.listdir(carpeta)
        assert len(archivos) == 1
        with open(os.path.join(carpeta, archivos[0]), "rb") as handle:
            assert handle.read() == contenido

        # La rama de originales cuelga del volumen, pero no del prefijo público.
        assert os.path.commonpath([storage.originals_path, storage.derivatives_path]) == (
            storage.base_path
        )
        assert not storage.originals_path.startswith(storage.derivatives_path)


def test_el_nombre_incorpora_la_huella_del_contenido(schema_app, admin_client, producto_id):
    """§15.3 regla 2: mismo contenido, mismo nombre; distinto contenido, otro."""
    contenido = image_bytes(size=(600, 600))
    primera = _subir(admin_client, producto_id, contenido).get_json()["data"]["image_url"]
    repetida = _subir(admin_client, producto_id, contenido).get_json()["data"]["image_url"]
    distinta = _subir(admin_client, producto_id, image_bytes(size=(700, 700))).get_json()["data"][
        "image_url"
    ]

    assert primera == repetida
    assert distinta != primera


def test_los_tres_tamanos_se_deducen_del_nombre(schema_app, admin_client, producto_id):
    """§15.3 regla 3: el frontend arma el `srcset` sin consultar la base."""
    url = _subir(admin_client, producto_id, image_bytes(size=(2000, 2000))).get_json()["data"][
        "image_url"
    ]
    canonico = DERIVATIVE_WIDTHS[CANONICAL_DERIVATIVE]

    with schema_app.app_context():
        carpeta = os.path.join(
            LocalStorage().derivatives_path, PRODUCTS_NAMESPACE, str(producto_id)
        )
        for ancho in DERIVATIVE_WIDTHS.values():
            derivada = url.replace(f"-{canonico}.webp", f"-{ancho}.webp")
            assert os.path.exists(os.path.join(carpeta, os.path.basename(derivada)))


def _imagen_transparente(size=(300, 300)) -> bytes:
    """Fuente RGBA con transparencia real y negro debajo de cada píxel
    transparente — exactamente el caso que exponía el bug: `.convert("RGB")`
    sobre esto revelaba ese negro en vez de componer sobre blanco."""
    buffer = io.BytesIO()
    imagen = Image.new("RGBA", size, (0, 0, 0, 0))
    dibujo = ImageDraw.Draw(imagen)
    dibujo.rectangle((60, 60, size[0] - 60, size[1] - 60), fill=(10, 20, 30, 255))
    imagen.save(buffer, format="PNG")
    return buffer.getvalue()


def test_el_webp_conserva_transparencia_real(schema_app, admin_client, producto_id):
    """El WebP debe funcionar sobre superficie clara u oscura sin caja de
    color detrás (`UDS-09`): la transparencia de la fuente no se descarta."""
    _subir(admin_client, producto_id, _imagen_transparente(), nombre="logo.png")

    with schema_app.app_context():
        storage = LocalStorage()
        carpeta = os.path.join(storage.derivatives_path, PRODUCTS_NAMESPACE, str(producto_id))
        archivo = next(f for f in os.listdir(carpeta) if f.endswith("-800.webp"))
        with Image.open(os.path.join(carpeta, archivo)) as derivado:
            assert derivado.mode == "RGBA"
            esquina = derivado.convert("RGBA").getpixel((2, 2))
            assert esquina[3] == 0, "la esquina transparente de la fuente debe seguir transparente"


def test_el_respaldo_jpeg_compone_sobre_blanco_en_vez_de_exponer_lo_que_hubiera_debajo(
    schema_app, admin_client, producto_id
):
    """Regresión: `Image.convert("RGB")` sobre una fuente con alfa no compone
    nada, solo descarta el canal y expone el color que hubiera debajo de cada
    píxel transparente — en este caso negro. El JPEG no admite alfa (es una
    limitación real del formato), así que debe componerse explícitamente
    sobre blanco con la máscara de alfa, no heredar ese negro."""
    _subir(admin_client, producto_id, _imagen_transparente(), nombre="logo.png")

    with schema_app.app_context():
        storage = LocalStorage()
        carpeta = os.path.join(storage.derivatives_path, PRODUCTS_NAMESPACE, str(producto_id))
        archivo = next(f for f in os.listdir(carpeta) if f.endswith("-800.jpg"))
        with Image.open(os.path.join(carpeta, archivo)) as derivado:
            assert derivado.mode == "RGB"
            esquina = derivado.getpixel((2, 2))
            # Tolerancia por la compresión con pérdida del JPEG.
            assert all(
                canal > 240 for canal in esquina
            ), f"la esquina transparente debía componerse sobre blanco, dio {esquina}"


def test_si_falla_un_derivado_falla_la_carga_completa(
    schema_app, admin_client, producto_id, monkeypatch
):
    """§15.4: preferible a registrar una fila cuyos derivados no existen."""

    def explota(self, original_file, derivative_dir, fingerprint):
        raise OSError("disco lleno")

    monkeypatch.setattr(LocalStorage, "_generate_derivatives", explota)

    response = _subir(admin_client, producto_id, image_bytes())

    assert response.status_code == 500
    with schema_app.app_context():
        # Ni original huérfano ni fila: la carga se deshace entera.
        carpeta = os.path.join(LocalStorage().originals_path, PRODUCTS_NAMESPACE, str(producto_id))
        assert os.listdir(carpeta) == [] if os.path.isdir(carpeta) else True
    assert admin_client.get(f"/api/v1/admin/products/{producto_id}/images").get_json()["data"] == []
