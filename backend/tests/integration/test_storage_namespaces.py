"""Espacios de nombres del almacenamiento (99_AI_DEVELOPMENT_GUIDE.md §17.1).

`04_BASE_DATOS.md` v1.1.0 suma dos consumidores de imágenes que antes no
existían: el logotipo y el collage de marca, y la foto de «Nuestra historia».
§17.1.8 regla 5 exige declarar el espacio en la guía **antes** de escribir
código; estas pruebas verifican que el código quedó igual a lo declarado.

Se ejercita el almacenamiento directamente porque en esta etapa todavía no hay
endpoints que lo expongan: lo que se está fijando es la convención de archivos,
no un contrato HTTP.
"""

import io
import os

import pytest
from PIL import Image as PillowImage
from werkzeug.datastructures import FileStorage

from app.infrastructure.storage.local_storage import (
    BANK_WIDTHS,
    BANKS_NAMESPACE,
    BRAND_WIDTHS,
    BRANDS_NAMESPACE,
    NAMESPACES,
    STORE_NAMESPACE,
    STORE_WIDTHS,
    LocalStorage,
)
from tests.fixtures.images import image_bytes


def _archivo(nombre: str = "pieza.png") -> FileStorage:
    return FileStorage(stream=io.BytesIO(image_bytes(size=(2000, 1000))), filename=nombre)


def _archivo_con_alfa(nombre: str = "logo.png") -> FileStorage:
    """Un logotipo real: PNG con canal alfa (fondo transparente)."""
    buffer = io.BytesIO()
    imagen = PillowImage.new("RGBA", (2000, 1000), (0, 0, 0, 0))
    # Un cuadrado opaco en el centro: sin esto la imagen sería 100%
    # transparente y no serviría para comprobar que el logotipo se conserva.
    relleno = PillowImage.new("RGBA", (800, 400), (20, 60, 200, 255))
    imagen.paste(relleno, (600, 300), relleno)
    imagen.save(buffer, format="PNG")
    return FileStorage(stream=io.BytesIO(buffer.getvalue()), filename=nombre)


@pytest.fixture
def storage(schema_app):
    with schema_app.app_context():
        yield LocalStorage()


def test_los_anchos_de_marcas_son_los_declarados_en_17_1_2(schema_app):
    """Conjunto cerrado: 400 miniatura, 800 estándar, 1600 detalle."""
    assert BRAND_WIDTHS == {"thumbnail": 400, "standard": 800, "detail": 1600}
    assert NAMESPACES[BRANDS_NAMESPACE]["canonical"] == "standard"


def test_los_anchos_de_la_tienda_son_dos_y_su_canonico_es_el_mayor(schema_app):
    """§17.1.2: un solo consumidor y una vista previa; un tercero no lo pide nadie."""
    assert STORE_WIDTHS == {"thumbnail": 800, "standard": 1600}
    assert NAMESPACES[STORE_NAMESPACE]["canonical"] == "standard"


def test_la_marca_agrupa_sus_archivos_por_identificador(storage):
    """§17.1.1: logotipo y collage pertenecen al mismo agregado."""
    ruta = storage.save_brand_image(_archivo(), brand_id=7)

    assert ruta.startswith(f"{BRANDS_NAMESPACE}/7/")
    # Excepción de fiabilidad (§17.1.6): sin alfa real en la fuente el
    # canónico de marca es JPEG, no WebP — ver `ALPHA_CANONICAL_NAMESPACES`
    # en `local_storage.py`. `_archivo()` no tiene canal alfa (RGB liso).
    assert ruta.endswith("-800.jpg")


def test_la_tienda_es_un_espacio_plano(storage):
    """No hay agregado que agrupe una sola foto institucional."""
    ruta = storage.save_store_image(_archivo())

    assert ruta.startswith(f"{STORE_NAMESPACE}/")
    # Plano: entre el espacio y el archivo no hay ningún segmento intermedio.
    assert ruta.count("/") == 1
    assert ruta.endswith("-1600.webp")


def test_marcas_genera_sus_tres_anchos_con_respaldo(storage):
    ruta = storage.save_brand_image(_archivo(), brand_id=9)
    carpeta = os.path.join(storage.derivatives_path, BRANDS_NAMESPACE, "9")

    huella = os.path.basename(ruta).split("-")[0]
    esperados = sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in BRAND_WIDTHS.values()
        for extension in ("webp", "jpg")
    )
    assert sorted(os.listdir(carpeta)) == esperados


def test_la_tienda_no_genera_un_ancho_que_nadie_pide(storage):
    """Dos anchos, no tres: el frontend deduce exactamente los que existen."""
    ruta = storage.save_store_image(_archivo())
    carpeta = os.path.join(storage.derivatives_path, STORE_NAMESPACE)

    huella = os.path.basename(ruta).split("-")[0]
    generados = [nombre for nombre in os.listdir(carpeta) if nombre.startswith(huella)]

    assert sorted(generados) == sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in STORE_WIDTHS.values()
        for extension in ("webp", "jpg")
    )
    assert not any(nombre.endswith(("-400.webp", "-2400.webp")) for nombre in generados)


def test_el_original_de_marca_queda_fuera_de_la_rama_publica(storage):
    """`AD-38`: el original es el activo autoritativo y nunca se sirve."""
    ruta = storage.save_brand_image(_archivo(), brand_id=11)
    huella = os.path.basename(ruta).split("-")[0]

    originales = os.path.join(storage.originals_path, BRANDS_NAMESPACE, "11")
    assert any(nombre.startswith(huella) for nombre in os.listdir(originales))
    assert not os.path.exists(
        os.path.join(storage.derivatives_path, BRANDS_NAMESPACE, "11", huella)
    )


def test_los_derivados_de_marca_conservan_la_proporcion(storage):
    """La altura es proporcional: el encuadre lo decide quien carga la imagen."""
    ruta = storage.save_brand_image(_archivo(), brand_id=13)
    huella = os.path.basename(ruta).split("-")[0]
    carpeta = os.path.join(storage.derivatives_path, BRANDS_NAMESPACE, "13")

    with PillowImage.open(os.path.join(carpeta, f"{huella}-800.webp")) as derivado:
        assert derivado.size == (800, 400)


def test_purge_brand_retira_las_dos_ramas(storage):
    storage.save_brand_image(_archivo(), brand_id=17)
    storage.purge_brand(17)

    for rama in (storage.originals_path, storage.derivatives_path):
        assert not os.path.exists(os.path.join(rama, BRANDS_NAMESPACE, "17"))


# ---------------------------------------------------------------------------
# Canónico con alfa real (§17.1.6 revisada): PNG, no JPEG ni WebP.
# ---------------------------------------------------------------------------


def test_un_logo_con_alfa_real_publica_png_como_canonico(storage):
    """Con transparencia real en la fuente, el canónico deja de ser JPEG."""
    ruta = storage.save_brand_image(_archivo_con_alfa(), brand_id=31)

    assert ruta.endswith("-800.png")


def test_el_png_canonico_conserva_transparencia_real(storage):
    """No es un respaldo compuesto sobre blanco: el fondo sigue siendo alfa 0."""
    ruta = storage.save_brand_image(_archivo_con_alfa(), brand_id=33)
    ruta_absoluta = os.path.join(storage.derivatives_path, ruta)

    with PillowImage.open(ruta_absoluta) as derivado:
        assert derivado.mode == "RGBA"
        esquina = derivado.getpixel((0, 0))
        assert esquina[3] == 0  # completamente transparente, no blanco compuesto


def test_el_logo_del_png_canonico_seguiria_siendo_el_mismo(storage):
    """El logotipo (píxel opaco) no se pierde ni cambia de color."""
    ruta = storage.save_brand_image(_archivo_con_alfa(), brand_id=35)
    ruta_absoluta = os.path.join(storage.derivatives_path, ruta)

    with PillowImage.open(ruta_absoluta) as derivado:
        centro = derivado.getpixel((derivado.width // 2, derivado.height // 2))
        assert centro == (20, 60, 200, 255)


def test_con_alfa_tambien_se_generan_webp_y_jpeg(storage):
    """El PNG es un tercer archivo, no un reemplazo: WebP y JPEG se siguen
    generando igual (`AD-38` — nada deja de existir por esto)."""
    ruta = storage.save_brand_image(_archivo_con_alfa(), brand_id=37)
    huella = os.path.basename(ruta).split("-")[0]
    carpeta = os.path.join(storage.derivatives_path, BRANDS_NAMESPACE, "37")

    esperados = sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in BRAND_WIDTHS.values()
        for extension in ("webp", "jpg", "png")
    )
    assert sorted(os.listdir(carpeta)) == esperados


def test_sin_alfa_no_se_genera_png_de_mas(storage):
    """Sin transparencia que preservar, el tercer archivo no tiene sentido."""
    storage.save_brand_image(_archivo(), brand_id=39)
    carpeta = os.path.join(storage.derivatives_path, BRANDS_NAMESPACE, "39")

    assert not any(nombre.endswith(".png") for nombre in os.listdir(carpeta))


def test_una_foto_de_collage_sin_alfa_en_otro_espacio_no_genera_png(storage):
    """La excepción de alfa es de `brands`: un espacio sin ella no cambia."""
    ruta = storage.save_store_image(_archivo())
    huella = os.path.basename(ruta).split("-")[0]
    carpeta = os.path.join(storage.derivatives_path, STORE_NAMESPACE)

    assert not any(
        nombre.startswith(huella) and nombre.endswith(".png") for nombre in os.listdir(carpeta)
    )


# ---------------------------------------------------------------------------
# Bancos (Superdescuentos): mini banner, espacio plano y escala de marca.
# ---------------------------------------------------------------------------


def test_los_anchos_de_bancos_son_los_declarados(schema_app):
    """Mini logotipo: se reutiliza la escala de `BRAND_WIDTHS`, sin el tercer ancho."""
    assert BANK_WIDTHS == {"thumbnail": 400, "standard": 800}
    assert NAMESPACES[BANKS_NAMESPACE]["canonical"] == "standard"


def test_el_banco_es_un_espacio_plano(storage):
    """Como banners: un banco tiene una sola pieza, sin agregado que la agrupe."""
    ruta = storage.save_bank_image(_archivo())

    assert ruta.startswith(f"{BANKS_NAMESPACE}/")
    assert ruta.count("/") == 1
    assert ruta.endswith("-800.webp")


def test_bancos_genera_sus_dos_anchos_con_respaldo(storage):
    ruta = storage.save_bank_image(_archivo())
    huella = os.path.basename(ruta).split("-")[0]
    carpeta = os.path.join(storage.derivatives_path, BANKS_NAMESPACE)

    generados = [nombre for nombre in os.listdir(carpeta) if nombre.startswith(huella)]
    assert sorted(generados) == sorted(
        f"{huella}-{ancho}.{extension}"
        for ancho in BANK_WIDTHS.values()
        for extension in ("webp", "jpg")
    )
