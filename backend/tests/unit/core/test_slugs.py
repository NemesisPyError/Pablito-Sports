"""Normalización de slugs (04_BASE_DATOS.md §9.2.1 v1.2.0)."""

import pytest

from app.core.utils.slugs import slugify


@pytest.mark.parametrize(
    ("texto", "esperado"),
    [
        ("Botín Adidas Predator", "botin-adidas-predator"),
        ("Botín Nike Mercurial Vapor 16", "botin-nike-mercurial-vapor-16"),
        ("Remera Adidas - Oficial", "remera-adidas-oficial"),
        ("Camiseta Niño Jesús", "camiseta-nino-jesus"),
    ],
    ids=["basico", "numeros", "guion-existente", "enie-y-tildes"],
)
def test_genera_el_slug_esperado(texto, esperado):
    assert slugify(texto) == esperado


def test_convierte_a_minusculas():
    assert slugify("PRODUCTO EN MAYÚSCULAS") == "producto-en-mayusculas"


def test_colapsa_espacios_multiples_en_un_solo_guion():
    assert slugify("Remera   con    espacios") == "remera-con-espacios"


def test_elimina_caracteres_especiales():
    assert slugify("Remera (Edición) #1 @Oficial!") == "remera-edicion-1-oficial"


def test_colapsa_guiones_duplicados():
    assert slugify("Remera --- Doble --- Guion") == "remera-doble-guion"


def test_elimina_guiones_al_inicio_y_al_final():
    assert slugify("-Remera Con Bordes-") == "remera-con-bordes"


def test_string_vacio_da_slug_vacio():
    """Quien llama decide el valor de reserva (`_insert_with_unique_slug`)."""
    assert slugify("") == ""


def test_solo_caracteres_especiales_da_slug_vacio():
    assert slugify("¡¡¡!!!???") == ""


def test_es_idempotente():
    una_vez = slugify("Botín Adidas Predator")
    assert slugify(una_vez) == una_vez
