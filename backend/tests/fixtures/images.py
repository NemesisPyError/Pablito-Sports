"""Imágenes de prueba reales (03_SEGURIDAD.md §11).

Las validaciones abren el archivo con Pillow, así que una carga de prueba con
bytes inventados ya no sirve: tiene que ser una imagen que se pueda decodificar.
"""

import io

from PIL import Image

# §11.1: por encima del mínimo de 200x200 y por debajo del máximo de 4000x4000.
VALID_SIZE = (300, 300)


def image_bytes(size=VALID_SIZE, image_format: str = "PNG") -> bytes:
    """Devuelve una imagen decodificable del tamaño y formato pedidos."""
    buffer = io.BytesIO()
    Image.new("RGB", size, color=(120, 140, 160)).save(buffer, format=image_format)
    return buffer.getvalue()


def upload(nombre: str = "prueba.png", contenido: bytes | None = None) -> dict:
    """Carga `multipart/form-data` lista para el cliente de pruebas."""
    return {"file": (io.BytesIO(contenido if contenido is not None else image_bytes()), nombre)}
