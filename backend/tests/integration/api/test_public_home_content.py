"""Contenido administrable de la portada (05_API.md §7.2, §7.2b, §7.2c).

Cubre las tres lecturas públicas que suma la v1.1.0: la zona de cada banner, la
historia de la tienda y las marcas destacadas.

El foco está en lo que un cambio futuro podría romper sin darse cuenta: que el
endpoint de banners siga respondiendo lo mismo cuando **no** se pide zona, que
`StoreSettingsPublicDTO` no crezca por la puerta de atrás, y que ninguna de las
respuestas nuevas exponga identificadores internos (`AD-12`).

**Nota de aislamiento:** `catalog_client` es de ámbito de sesión, de modo que el
catálogo se construye una vez y lo comparte toda la suite. Cada fixture de este
módulo deshace exactamente lo que creó o modificó; si no, la contaminación no se
notaría acá sino en el módulo que corra después.
"""

import pytest
from sqlalchemy import text

from app.extensions import db
from app.models import Banner, Brand, BrandImage, StoreSetting

RUTA_BANNERS = "/api/v1/banners"
RUTA_ABOUT = "/api/v1/store/about"
RUTA_SHOWCASES = "/api/v1/store/brand-showcases"
RUTA_SETTINGS = "/api/v1/store/settings"
RUTA_MARCAS = "/api/v1/brands"

CAMPOS_BANNER = {
    "title",
    "subtitle",
    "image_url",
    "link_url",
    "button_label",
    "placement",
    "position",
}
CAMPOS_ABOUT = {"about_title", "about_text", "about_image_url", "email"}
CAMPOS_SHOWCASE = {"slug", "name", "image_url", "tagline", "position", "images"}

CAMPOS_MARCA_PORTADA = ("home_position", "tagline", "image_path", "is_active")
CAMPOS_HISTORIA = ("about_title", "about_text", "about_image_path", "email")


def _datos(respuesta):
    assert respuesta.status_code == 200, respuesta.get_json()
    cuerpo = respuesta.get_json()
    assert cuerpo["success"] is True
    return cuerpo["data"]


def _restaurar(entidad, snapshot):
    for campo, valor in snapshot.items():
        setattr(entidad, campo, valor)


@pytest.fixture
def portada(catalog_client):
    """Una pieza por zona y una marca destacada con collage."""
    marca = db.session.query(Brand).filter_by(slug="nike").one()
    original = {campo: getattr(marca, campo) for campo in CAMPOS_MARCA_PORTADA}

    marca.home_position = 0
    marca.tagline = "Innovación y rendimiento"
    marca.image_path = "brands/1/aaaa-800.webp"

    db.session.add_all(
        [
            Banner(
                title="Novedad",
                placement="news",
                position=0,
                image_path="banners/n.webp",
                link_url="/catalogo?is_new=true",
                button_label="Ver novedades",
            ),
            Banner(title="Oferta", placement="promo", position=0),
            BrandImage(brand_id=marca.id, file_path="brands/1/b-800.webp", position=1),
            BrandImage(brand_id=marca.id, file_path="brands/1/c-800.webp", position=0),
            # Retirada del collage: no debe publicarse.
            BrandImage(
                brand_id=marca.id, file_path="brands/1/d-800.webp", position=2, is_active=False
            ),
        ]
    )
    db.session.commit()

    try:
        yield catalog_client
    finally:
        db.session.execute(
            text("DELETE FROM brand_images WHERE brand_id = :brand_id"), {"brand_id": marca.id}
        )
        db.session.execute(text("DELETE FROM banners WHERE placement IN ('news', 'promo')"))
        _restaurar(marca, original)
        db.session.commit()


@pytest.fixture
def historia(catalog_client):
    """Configuración con historia y correo cargados."""
    settings = db.session.query(StoreSetting).one()
    original = {campo: getattr(settings, campo) for campo in CAMPOS_HISTORIA}

    settings.about_title = "Más que una tienda"
    settings.about_text = "Nuestra historia."
    settings.email = "hola@pablitosports.com"
    db.session.commit()

    try:
        yield catalog_client
    finally:
        _restaurar(settings, original)
        db.session.commit()


@pytest.fixture
def sin_configuracion(catalog_client):
    """Base sin la fila única de configuración, restaurada al terminar."""
    settings = db.session.query(StoreSetting).one()
    snapshot = {
        columna.name: getattr(settings, columna.name) for columna in StoreSetting.__table__.columns
    }

    db.session.delete(settings)
    db.session.commit()

    try:
        yield catalog_client
    finally:
        db.session.add(StoreSetting(**snapshot))
        db.session.commit()


# --- §7.2 Banners con zona -------------------------------------------------


def test_sin_placement_devuelve_todas_las_zonas(portada):
    """El parámetro es aditivo: quien ya consumía el endpoint no cambia."""
    zonas = {banner["placement"] for banner in _datos(portada.get(RUTA_BANNERS))}

    assert zonas == {"hero", "news", "promo"}


def test_filtra_por_zona(portada):
    datos = _datos(portada.get(f"{RUTA_BANNERS}?placement=news"))

    assert [banner["title"] for banner in datos] == ["Novedad"]


def test_una_zona_desconocida_se_ignora(portada):
    """§4.6 y `AD-26`: en una lectura, el peor caso es un listado más amplio."""
    todos = _datos(portada.get(RUTA_BANNERS))
    raro = _datos(portada.get(f"{RUTA_BANNERS}?placement=inventada"))

    assert len(raro) == len(todos)


def test_una_zona_sin_piezas_devuelve_lista_vacia(catalog_client):
    assert _datos(catalog_client.get(f"{RUTA_BANNERS}?placement=promo")) == []


def test_el_banner_expone_su_zona_y_el_texto_del_boton(portada):
    novedad = _datos(portada.get(f"{RUTA_BANNERS}?placement=news"))[0]

    assert set(novedad) == CAMPOS_BANNER
    assert novedad["placement"] == "news"
    assert novedad["button_label"] == "Ver novedades"


def test_el_banner_sigue_sin_exponer_identificadores(portada):
    """`AD-12`: la clave estable es `placement` + `position`."""
    for banner in _datos(portada.get(RUTA_BANNERS)):
        assert "id" not in banner


def test_los_banners_heredados_quedaron_en_hero(catalog_client):
    """La migración no reubica piezas: quedan donde siempre estuvieron."""
    datos = _datos(catalog_client.get(RUTA_BANNERS))

    assert datos
    assert all(banner["placement"] == "hero" for banner in datos)


# --- §7.2b Historia --------------------------------------------------------


def test_about_expone_exactamente_sus_cuatro_campos(catalog_client):
    assert set(_datos(catalog_client.get(RUTA_ABOUT))) == CAMPOS_ABOUT


def test_about_devuelve_lo_cargado(historia):
    datos = _datos(historia.get(RUTA_ABOUT))

    assert datos["about_title"] == "Más que una tienda"
    assert datos["email"] == "hola@pablitosports.com"


def test_about_sin_cargar_responde_200_con_nulos(catalog_client):
    """La sección vacía no es un error: la configuración existe, falta el texto."""
    datos = _datos(catalog_client.get(RUTA_ABOUT))

    assert datos["about_title"] is None
    assert datos["about_image_url"] is None


def test_about_es_404_sin_configuracion_inicializada(sin_configuracion):
    assert sin_configuracion.get(RUTA_ABOUT).status_code == 404


def test_la_configuracion_publica_no_crecio(historia):
    """`AD-12` congela `StoreSettingsPublicDTO` en cinco campos (§10.2).

    Se pide con la historia cargada a propósito: es el escenario donde un
    descuido podría filtrar los campos nuevos al contrato público.
    """
    datos = _datos(historia.get(RUTA_SETTINGS))

    assert set(datos) == {
        "store_name",
        "whatsapp_number",
        "address",
        "business_hours",
        "social_links",
    }


# --- §7.2c Marcas destacadas ----------------------------------------------


def test_la_vitrina_expone_sus_campos(portada):
    vitrina = _datos(portada.get(RUTA_SHOWCASES))

    assert len(vitrina) == 1
    assert set(vitrina[0]) == CAMPOS_SHOWCASE
    assert vitrina[0]["slug"] == "nike"
    assert vitrina[0]["tagline"] == "Innovación y rendimiento"


def test_solo_aparecen_las_marcas_con_posicion_en_portada(portada):
    """`home_position` nulo = marca del catálogo, no marca destacada."""
    slugs = {marca["slug"] for marca in _datos(portada.get(RUTA_SHOWCASES))}

    assert slugs == {"nike"}
    # Adidas y Puma siguen existiendo como filtro del catálogo.
    assert {marca["slug"] for marca in _datos(portada.get(RUTA_MARCAS))} >= {"adidas", "puma"}


def test_el_collage_llega_ordenado_y_sin_piezas_retiradas(portada):
    imagenes = _datos(portada.get(RUTA_SHOWCASES))[0]["images"]

    assert [imagen["position"] for imagen in imagenes] == [0, 1]
    assert all("/d-800.webp" not in imagen["image_url"] for imagen in imagenes)


def test_las_piezas_del_collage_no_exponen_identificadores(portada):
    for imagen in _datos(portada.get(RUTA_SHOWCASES))[0]["images"]:
        assert set(imagen) == {"image_url", "alt_text", "position"}


def test_la_vitrina_esta_vacia_si_nadie_fue_destacado(catalog_client):
    assert _datos(catalog_client.get(RUTA_SHOWCASES)) == []


def test_una_marca_inactiva_no_llega_a_la_portada(portada):
    marca = db.session.query(Brand).filter_by(slug="nike").one()
    marca.is_active = False
    db.session.commit()

    assert _datos(portada.get(RUTA_SHOWCASES)) == []


# --- §7.6 Listado de marcas ------------------------------------------------


def test_el_listado_de_marcas_expone_el_logotipo(portada):
    marcas = {marca["slug"]: marca for marca in _datos(portada.get(RUTA_MARCAS))}

    assert marcas["nike"]["image_url"] == "/uploads/brands/1/aaaa-800.webp"
    # Sin logotipo cargado, `null` es el estado normal (`UDS-09`).
    assert marcas["adidas"]["image_url"] is None
