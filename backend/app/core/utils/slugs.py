"""Normaliza texto libre a slug (04_BASE_DATOS.md §9.2.1 v1.2.0).

Utilidad centralizada: cualquier lugar del backend que necesite derivar un
slug de un nombre reutiliza `slugify`, en vez de reimplementar su propia
variante de reemplazos y quedar desalineado con esta.
"""

import re
import unicodedata

_NO_ALFANUMERICO = re.compile(r"[^a-z0-9]+")
_GUIONES_REPETIDOS = re.compile(r"-{2,}")


def slugify(texto: str) -> str:
    """minúsculas, sin tildes/diacríticos (NFKD descompone "ñ" en "n" + "~"),
    espacios y símbolos convertidos a "-", sin guiones repetidos ni en los
    extremos. Puede devolver `""` si `texto` no tiene ningún carácter
    alfanumérico: quien llama decide el valor de reserva.
    """
    descompuesto = unicodedata.normalize("NFKD", texto or "")
    sin_diacriticos = "".join(c for c in descompuesto if not unicodedata.combining(c))
    minusculas = sin_diacriticos.lower()
    con_guiones = _NO_ALFANUMERICO.sub("-", minusculas)
    return _GUIONES_REPETIDOS.sub("-", con_guiones).strip("-")
