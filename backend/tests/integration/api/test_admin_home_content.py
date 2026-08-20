"""Panel de la portada administrable (05_API.md §9.6, §9.11, §9.12, v1.1.0).

Cubre lo que la v1.1.0 suma al panel: logotipo y collage de marca, zona y botón
de banner, y contenido institucional.

El foco está en las reglas que solo viven en el servicio —el máximo del collage,
el rechazo de una zona inválida al escribir, el orden completo obligatorio— y en
que la autorización siga cerrada, que es lo que un endpoint nuevo suele olvidar.
"""

import io

import pytest
from sqlalchemy import text

from app.extensions import db
from app.models import Brand, StoreSetting
from app.services.admin_brand_image_service import MAX_COLLAGE_IMAGES
from tests.fixtures.images import image_bytes


def _archivo(nombre: str = "pieza.png") -> dict:
    return {"image": (io.BytesIO(image_bytes()), nombre)}


def _datos(respuesta, esperado: int = 200):
    assert respuesta.status_code == esperado, respuesta.get_json()
    return respuesta.get_json()["data"]


@pytest.fixture
def anonimo(schema_app):
    """Cliente sin sesión.

    **No** se usa `catalog_client` en este módulo a propósito: es de ámbito de
    sesión, de modo que el primer módulo que lo pide decide cuándo se carga el
    catálogo compartido. Pedirlo desde una batería administrativa lo adelanta y
    rompe los módulos que asumen un catálogo vacío.
    """
    return schema_app.test_client()


@pytest.fixture
def marca_id(schema_app):
    """Marca propia del módulo, retirada al terminar."""
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM brands WHERE slug = 'marca-portada'"))
        db.session.commit()

        marca = Brand(name="Marca Portada", slug="marca-portada")
        db.session.add(marca)
        db.session.commit()
        identificador = marca.id

        try:
            yield identificador
        finally:
            db.session.execute(
                text("DELETE FROM brand_images WHERE brand_id = :id"), {"id": identificador}
            )
            db.session.execute(text("DELETE FROM audit_logs WHERE entity_type = 'brand_image'"))
            db.session.execute(text("DELETE FROM brands WHERE id = :id"), {"id": identificador})
            db.session.commit()


@pytest.fixture
def otra_marca_id(schema_app):
    """Segunda marca del módulo: evita depender del catálogo compartido."""
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM brands WHERE slug = 'marca-vecina'"))
        db.session.commit()

        marca = Brand(name="Marca Vecina", slug="marca-vecina")
        db.session.add(marca)
        db.session.commit()
        identificador = marca.id

        try:
            yield identificador
        finally:
            db.session.execute(
                text("DELETE FROM brand_images WHERE brand_id = :id"), {"id": identificador}
            )
            db.session.execute(text("DELETE FROM brands WHERE id = :id"), {"id": identificador})
            db.session.commit()


# --- §9.6 Campos de portada de la marca ------------------------------------


def test_la_marca_acepta_frase_y_posicion_de_portada(admin_client, marca_id):
    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}",
        json={
            "name": "Marca Portada",
            "slug": "marca-portada",
            "tagline": "Innovación y rendimiento",
            "home_position": 2,
        },
    )

    datos = _datos(respuesta)
    assert datos["tagline"] == "Innovación y rendimiento"
    assert datos["home_position"] == 2
    assert datos["image_url"] is None


def test_una_posicion_negativa_es_422(admin_client, marca_id):
    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}",
        json={"name": "Marca Portada", "slug": "marca-portada", "home_position": -1},
    )

    assert respuesta.status_code == 422


def test_una_posicion_que_no_es_entero_es_422(admin_client, marca_id):
    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}",
        json={"name": "Marca Portada", "slug": "marca-portada", "home_position": "primera"},
    )

    assert respuesta.status_code == 422


def test_posicion_vacia_retira_la_marca_de_la_portada(admin_client, marca_id):
    """Vacío es «sin bloque propio», que no es lo mismo que la posición 0."""
    admin_client.put(
        f"/api/v1/admin/brands/{marca_id}",
        json={"name": "Marca Portada", "slug": "marca-portada", "home_position": 0},
    )
    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}",
        json={"name": "Marca Portada", "slug": "marca-portada", "home_position": ""},
    )

    assert _datos(respuesta)["home_position"] is None


# --- §9.6 Logotipo ---------------------------------------------------------


def test_carga_y_baja_del_logotipo(admin_client, marca_id):
    subida = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}/image",
        data=_archivo(),
        content_type="multipart/form-data",
    )
    url = _datos(subida)["image_url"]
    assert url.startswith(f"/uploads/brands/{marca_id}/")
    # Excepción de fiabilidad (`99_AI_DEVELOPMENT_GUIDE.md` v1.4.0 §17.1.6):
    # el canónico de `brands` es JPEG, no WebP.
    assert url.endswith("-800.jpg")

    baja = admin_client.delete(f"/api/v1/admin/brands/{marca_id}/image")
    assert _datos(baja)["image_url"] is None


def test_el_logotipo_exige_archivo(admin_client, marca_id):
    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}/image", data={}, content_type="multipart/form-data"
    )

    assert respuesta.status_code == 422


def test_el_logotipo_de_una_marca_inexistente_es_404(admin_client):
    respuesta = admin_client.put(
        "/api/v1/admin/brands/999999/image",
        data=_archivo(),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code == 404


def test_el_logotipo_exige_sesion(anonimo, marca_id):
    respuesta = anonimo.put(
        f"/api/v1/admin/brands/{marca_id}/image",
        data=_archivo(),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code in (401, 403)


# --- §9.6 Collage ----------------------------------------------------------


def _agregar(cliente, marca_id, alt_text=None):
    data = _archivo()
    if alt_text is not None:
        data["alt_text"] = alt_text
    return cliente.post(
        f"/api/v1/admin/brands/{marca_id}/images",
        data=data,
        content_type="multipart/form-data",
    )


def test_las_piezas_se_agregan_al_final(admin_client, marca_id):
    primera = _datos(_agregar(admin_client, marca_id), 201)
    segunda = _datos(_agregar(admin_client, marca_id), 201)

    assert primera["position"] == 0
    assert segunda["position"] == 1


def test_la_pieza_guarda_su_texto_alternativo(admin_client, marca_id):
    pieza = _datos(_agregar(admin_client, marca_id, alt_text="Zapatilla en la cancha"), 201)

    assert pieza["alt_text"] == "Zapatilla en la cancha"


def test_el_collage_no_admite_mas_de_cuatro_piezas(admin_client, marca_id):
    for _ in range(MAX_COLLAGE_IMAGES):
        assert _agregar(admin_client, marca_id).status_code == 201

    excedida = _agregar(admin_client, marca_id)

    assert excedida.status_code == 409, excedida.get_json()


def test_una_pieza_dada_de_baja_libera_lugar(admin_client, marca_id):
    """El límite cuenta piezas publicables, no filas históricas."""
    ids = [_datos(_agregar(admin_client, marca_id), 201)["id"] for _ in range(MAX_COLLAGE_IMAGES)]

    assert (
        admin_client.delete(f"/api/v1/admin/brands/{marca_id}/images/{ids[0]}").status_code == 204
    )
    assert _agregar(admin_client, marca_id).status_code == 201


def test_reordenar_exige_la_lista_completa(admin_client, marca_id):
    primera = _datos(_agregar(admin_client, marca_id), 201)
    _agregar(admin_client, marca_id)

    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}/images/order", json={"image_ids": [primera["id"]]}
    )

    assert respuesta.status_code == 422


def test_reordenar_aplica_el_orden_enviado(admin_client, marca_id):
    primera = _datos(_agregar(admin_client, marca_id), 201)
    segunda = _datos(_agregar(admin_client, marca_id), 201)

    datos = _datos(
        admin_client.put(
            f"/api/v1/admin/brands/{marca_id}/images/order",
            json={"image_ids": [segunda["id"], primera["id"]]},
        )
    )

    assert [pieza["id"] for pieza in datos] == [segunda["id"], primera["id"]]
    assert [pieza["position"] for pieza in datos] == [0, 1]


def test_reordenar_rechaza_identificadores_repetidos(admin_client, marca_id):
    primera = _datos(_agregar(admin_client, marca_id), 201)

    respuesta = admin_client.put(
        f"/api/v1/admin/brands/{marca_id}/images/order",
        json={"image_ids": [primera["id"], primera["id"]]},
    )

    assert respuesta.status_code == 422


def test_una_pieza_de_otra_marca_es_404(admin_client, marca_id, otra_marca_id):
    """El recurso está anidado: la pieza de otra marca no existe en esta ruta."""
    ajena = _datos(_agregar(admin_client, otra_marca_id), 201)

    respuesta = admin_client.delete(f"/api/v1/admin/brands/{marca_id}/images/{ajena['id']}")

    assert respuesta.status_code == 404


def test_el_collage_exige_sesion(anonimo, marca_id):
    assert anonimo.get(f"/api/v1/admin/brands/{marca_id}/images").status_code in (401, 403)


# --- §9.11 Zona y botón del banner ----------------------------------------


def _crear_banner(cliente, **campos):
    data = {"title": "Pieza", "position": "0", **campos}
    data["image"] = (io.BytesIO(image_bytes()), "banner.png")
    return cliente.post("/api/v1/admin/banners", data=data, content_type="multipart/form-data")


@pytest.fixture(autouse=True)
def _limpiar_banners(schema_app):
    yield
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM banners WHERE title = 'Pieza'"))
        db.session.commit()


def test_el_banner_guarda_zona_y_boton(admin_client):
    datos = _datos(
        _crear_banner(admin_client, placement="promo", button_label="Comprar ahora"), 201
    )

    assert datos["placement"] == "promo"
    assert datos["button_label"] == "Comprar ahora"


def test_sin_zona_el_banner_es_hero(admin_client):
    """Es la zona que tenían las piezas antes de que existiera el campo."""
    assert _datos(_crear_banner(admin_client), 201)["placement"] == "hero"


def test_una_zona_invalida_es_422_al_escribir(admin_client):
    """Contraste deliberado con la lectura: al guardar no se ignora (§4.6)."""
    respuesta = _crear_banner(admin_client, placement="portada")

    assert respuesta.status_code == 422
    campos = {error["field"] for error in respuesta.get_json()["errors"]}
    assert "placement" in campos


def test_un_boton_demasiado_largo_es_422(admin_client):
    respuesta = _crear_banner(admin_client, button_label="x" * 51)

    assert respuesta.status_code == 422


def test_el_panel_filtra_banners_por_zona(admin_client):
    _crear_banner(admin_client, placement="promo")

    datos = _datos(admin_client.get("/api/v1/admin/banners?placement=promo"))

    assert datos
    assert all(banner["placement"] == "promo" for banner in datos)


# --- §9.12 Contenido institucional -----------------------------------------


@pytest.fixture
def configuracion_restaurada(schema_app):
    """Configuración de tienda propia del módulo, restaurada al terminar.

    Si la fila única no existe, la crea y la retira después; si existía, guarda
    una instantánea y la repone. Las dos ramas hacen falta porque este módulo no
    usa `catalog_client` —ver `anonimo`— y por tanto no puede dar por sentado el
    catálogo compartido.

    La restauración va **por base de datos y no por el endpoint**: el catálogo
    de pruebas trae una plantilla heredada de llave simple que `RN-60` ya no
    acepta, de modo que un `PUT` de restauración fallaría con `422` y dejaría la
    configuración cambiada para todos los módulos posteriores.
    """
    with schema_app.app_context():
        settings = db.session.query(StoreSetting).one_or_none()
        creada = settings is None

        if creada:
            settings = StoreSetting(
                id=1,
                store_name="Pablito Sports",
                whatsapp_number="+595981123456",
                message_template="Hola! {{items}} Total: {{total}}",
                item_template="- {{name}}",
                featured_products_count=8,
            )
            db.session.add(settings)
            db.session.commit()
            snapshot = None
        else:
            snapshot = {
                columna.name: getattr(settings, columna.name)
                for columna in StoreSetting.__table__.columns
            }

        try:
            yield settings
        finally:
            vigente = db.session.query(StoreSetting).one_or_none()
            if creada:
                if vigente is not None:
                    db.session.delete(vigente)
            elif vigente is not None:
                for campo, valor in snapshot.items():
                    setattr(vigente, campo, valor)
            db.session.commit()


def test_la_configuracion_guarda_correo_e_historia(admin_client, anonimo, configuracion_restaurada):
    actual = _datos(admin_client.get("/api/v1/admin/store/settings"))

    payload = {
        **actual,
        "email": "contacto@pablitosports.com",
        "about_title": "Nuestra historia",
        "about_text": "Texto institucional.",
        # El `PUT` reemplaza el recurso completo (§9.12), así que hay que
        # enviar plantillas válidas aunque lo que se esté probando sea otra cosa.
        "message_template": "Hola! {{items}} Total: {{total}}",
        "item_template": "- {{name}}",
    }
    payload.pop("about_image_url", None)

    datos = _datos(admin_client.put("/api/v1/admin/store/settings", json=payload))

    assert datos["email"] == "contacto@pablitosports.com"
    assert datos["about_title"] == "Nuestra historia"
    # Y llega al catálogo por su recurso público.
    publico = _datos(anonimo.get("/api/v1/store/about"))
    assert publico["about_text"] == "Texto institucional."


def test_la_foto_de_historia_se_carga_y_se_quita(admin_client, configuracion_restaurada):
    subida = admin_client.put(
        "/api/v1/admin/store/about-image",
        data=_archivo("historia.png"),
        content_type="multipart/form-data",
    )
    url = _datos(subida)["about_image_url"]

    assert url.startswith("/uploads/store/")
    assert url.endswith("-1600.webp")

    baja = admin_client.delete("/api/v1/admin/store/about-image")
    assert _datos(baja)["about_image_url"] is None


def test_la_foto_de_historia_exige_archivo(admin_client):
    respuesta = admin_client.put(
        "/api/v1/admin/store/about-image", data={}, content_type="multipart/form-data"
    )

    assert respuesta.status_code == 422


def test_la_foto_de_historia_exige_sesion(anonimo):
    respuesta = anonimo.put(
        "/api/v1/admin/store/about-image",
        data=_archivo("historia.png"),
        content_type="multipart/form-data",
    )

    assert respuesta.status_code in (401, 403)
