"""Ciclo de vida de los archivos que NO son imágenes de producto (post-S13).

S-13 cerró el ciclo de vida de las imágenes de producto. Esta suite cubre los
tres espacios que quedaban: banners, marcas —logotipo y collage— y la foto de la
tienda. En los tres, reemplazar o retirar la imagen dejaba el archivo anterior
en el volumen y **descargable por su URL para siempre**; con
`Cache-Control: immutable, max-age=1y` (S-09), una caché compartida podía
seguir sirviéndolo un año más.

Lo que se comprueba no es que «se borre algo», sino las dos mitades del
contrato, que es donde está el riesgo real:

  · el archivo que ya nadie referencia **se va**;
  · el archivo que **sí** sigue referenciado **se queda**.

La segunda importa especialmente en el espacio `brands/<id>/`: es el único del
proyecto con **dos tablas dueñas** —`Brand.image_path` (logotipo) y
`BrandImage.file_path` (collage)—. Como las rutas llevan la huella del
contenido, subir la misma imagen como logotipo y como pieza produce exactamente
la misma ruta, y un borrado ingenuo dejaría a la otra fila apuntando al vacío.
"""

import io
import secrets
from datetime import UTC, datetime

import pytest
from PIL import Image as PILImage
from werkzeug.datastructures import FileStorage

from app.extensions import db
from app.infrastructure.storage import LocalStorage
from app.models import Administrator, Banner, Brand, StoreSetting
from app.repositories.admin_brand_image_repository import AdminBrandImageRepository
from app.services.admin_banner_service import AdminBannerService
from app.services.admin_brand_image_service import AdminBrandImageService
from app.services.admin_classification_service import AdminBrandService
from app.services.store_setting_service import StoreSettingService

# Marca única por EJECUCIÓN de la suite. Las rutas llevan la huella del
# contenido, así que sin esto dos corridas producirían los mismos archivos y los
# tests verían las filas que dejó la anterior (`AD-18`: no hay borrado físico).
# Dentro de una misma corrida, el mismo `color` sigue dando la misma huella, que
# es justo lo que necesita el test de referencias compartidas.
_MARCA_DE_CORRIDA = secrets.randbelow(2**24)

# Los banners de esta suite se marcan y se retiran al terminar. Sin esto quedan
# vivos y, al acumularse entre corridas, empujan fuera de la primera página del
# panel a los banners de `test_admin_banners.py`, que entonces falla sin tener
# nada que ver. Es la clase de interferencia que sólo aparece en la suite
# completa, no ejecutando el archivo suelto.
TITULO_DE_PRUEBA = "lifecycle-extra"


def _imagen(color) -> FileStorage:
    """Una imagen real: el contenido decide la huella, y la huella la ruta."""
    imagen = PILImage.new("RGB", (900, 700), color)
    # Un píxel con la marca de la corrida: cambia el contenido, no el test.
    imagen.putpixel(
        (0, 0),
        (
            _MARCA_DE_CORRIDA & 0xFF,
            (_MARCA_DE_CORRIDA >> 8) & 0xFF,
            (_MARCA_DE_CORRIDA >> 16) & 0xFF,
        ),
    )
    buffer = io.BytesIO()
    imagen.save(buffer, format="PNG")
    buffer.seek(0)
    return FileStorage(stream=buffer, filename="prueba.png", content_type="image/png")


def _existe(almacen: LocalStorage, ruta: str) -> bool:
    import os

    return os.path.exists(os.path.join(almacen.derivatives_path, ruta))


@pytest.fixture
def entorno(app, request):
    """Un administrador propio por test, para firmar la auditoría sin chocar."""
    # Idempotente: la suite comparte base entre ejecuciones y las filas de
    # negocio no se borran (`AD-18`), así que se reutiliza la del test si ya está.
    sufijo = request.node.name[-40:].replace("[", "-").replace("]", "")
    usuario = f"lc-{sufijo}"[:100]
    with app.app_context():
        admin = db.session.query(Administrator).filter_by(username=usuario).one_or_none()
        if admin is None:
            admin = Administrator(
                username=usuario,
                email=f"{usuario}@pablitosports.test"[:255],
                password_hash="x",
                role="super_administrator",
            )
            db.session.add(admin)
        if db.session.get(StoreSetting, 1) is None:
            db.session.add(
                StoreSetting(
                    id=1,
                    store_name="Pablito Sports",
                    whatsapp_number="+595981123456",
                    address="Av. Mariscal López 1234, Asunción",
                    business_hours="Lunes a sábado de 08:00 a 19:00",
                    social_links={},
                    message_template="Hola! {items}",
                    item_template="- {name}",
                    featured_products_count=8,
                )
            )
        db.session.commit()
        yield admin.id

        # Retirar los banners de la suite: la fila sobrevive (`AD-18`), pero
        # marcada como borrada ya no aparece en el listado del panel.
        db.session.rollback()
        ahora = datetime.now(UTC)
        for banner in (
            db.session.query(Banner)
            .filter(Banner.title == TITULO_DE_PRUEBA, Banner.deleted_at.is_(None))
            .all()
        ):
            banner.deleted_at = ahora
            banner.is_active = False
        db.session.commit()


# ---------------------------------------------------------------------------
# Banners
# ---------------------------------------------------------------------------


def test_reemplazar_la_imagen_de_un_banner_retira_la_anterior(entorno, app):
    with app.app_context():
        almacen = LocalStorage()
        vieja = almacen.save_banner(_imagen((10, 20, 30)))
        nueva = almacen.save_banner(_imagen((90, 80, 70)))
        assert vieja != nueva
        assert _existe(almacen, vieja)

        from app.schemas.banner_schemas import BannerInput

        entrada = BannerInput(
            title=TITULO_DE_PRUEBA,
            subtitle=None,
            link_url=None,
            button_label=None,
            placement="hero",
            position=1,
            starts_at=None,
            ends_at=None,
            is_active=True,
        )
        dto = AdminBannerService.create(entrada, image_path=vieja, administrator_id=entorno)
        AdminBannerService.update(dto.id, entrada, image_path=nueva, administrator_id=entorno)

        assert not _existe(almacen, vieja), "la imagen reemplazada siguió en disco"
        assert _existe(almacen, nueva), "la imagen nueva no debía tocarse"


def test_dos_banners_con_la_misma_imagen_no_se_pisan(entorno, app):
    """Misma imagen = misma huella = misma ruta: no puede borrarse en cascada."""
    with app.app_context():
        almacen = LocalStorage()
        compartida = almacen.save_banner(_imagen((5, 5, 5)))
        otra = almacen.save_banner(_imagen((200, 100, 50)))

        from app.schemas.banner_schemas import BannerInput

        entrada = BannerInput(
            title=TITULO_DE_PRUEBA,
            subtitle=None,
            link_url=None,
            button_label=None,
            placement="hero",
            position=1,
            starts_at=None,
            ends_at=None,
            is_active=True,
        )
        uno = AdminBannerService.create(entrada, image_path=compartida, administrator_id=entorno)
        AdminBannerService.create(entrada, image_path=compartida, administrator_id=entorno)

        # Se cambia la imagen del primero: el archivo lo sigue usando el segundo.
        AdminBannerService.update(uno.id, entrada, image_path=otra, administrator_id=entorno)

        assert _existe(almacen, compartida), "se borró un archivo aún referenciado"


def test_retirar_un_banner_retira_su_imagen(entorno, app):
    with app.app_context():
        almacen = LocalStorage()
        ruta = almacen.save_banner(_imagen((44, 55, 66)))

        from app.schemas.banner_schemas import BannerInput

        entrada = BannerInput(
            title=TITULO_DE_PRUEBA,
            subtitle=None,
            link_url=None,
            button_label=None,
            placement="hero",
            position=1,
            starts_at=None,
            ends_at=None,
            is_active=True,
        )
        dto = AdminBannerService.create(entrada, image_path=ruta, administrator_id=entorno)
        assert _existe(almacen, ruta)

        AdminBannerService.delete(dto.id, administrator_id=entorno)

        assert not _existe(almacen, ruta)


# ---------------------------------------------------------------------------
# Marcas: el espacio con DOS tablas dueñas
# ---------------------------------------------------------------------------


def _marca(nombre: str) -> int:
    """Idempotente, por el mismo motivo que el administrador de la fixture."""
    marca = db.session.query(Brand).filter_by(slug=nombre).one_or_none()
    if marca is None:
        marca = Brand(name=nombre, slug=nombre, is_active=True)
        db.session.add(marca)
        db.session.commit()
    return marca.id


def test_retirar_una_pieza_del_collage_retira_su_archivo(entorno, app):
    with app.app_context():
        marca_id = _marca(f"lc-collage-{entorno}-{_MARCA_DE_CORRIDA}")
        almacen = LocalStorage()
        ruta = almacen.save_brand_image(_imagen((11, 22, 33)), brand_id=marca_id)

        pieza = AdminBrandImageService.add(
            marca_id, file_path=ruta, alt_text=None, administrator_id=entorno
        )
        assert _existe(almacen, ruta)

        AdminBrandImageService.delete(marca_id, pieza["id"], administrator_id=entorno)

        assert not _existe(almacen, ruta)


def test_el_collage_no_borra_el_archivo_que_usa_el_logotipo(entorno, app):
    """La referencia compartida entre las dos tablas del espacio `brands/`.

    Si la misma imagen es el logotipo y una pieza del collage, comparten ruta.
    Retirar la pieza no puede llevarse el archivo del logotipo.
    """
    with app.app_context():
        marca_id = _marca(f"lc-compartida-{entorno}-{_MARCA_DE_CORRIDA}")
        almacen = LocalStorage()
        ruta = almacen.save_brand_image(_imagen((77, 88, 99)), brand_id=marca_id)

        AdminBrandService.set_image(marca_id, ruta, administrator_id=entorno)
        pieza = AdminBrandImageService.add(
            marca_id, file_path=ruta, alt_text=None, administrator_id=entorno
        )

        AdminBrandImageService.delete(marca_id, pieza["id"], administrator_id=entorno)

        assert _existe(almacen, ruta), "se borró el archivo que aún usa el logotipo"


def test_el_logotipo_no_borra_el_archivo_que_usa_el_collage(entorno, app):
    """El recíproco del anterior, que es el que se olvida."""
    with app.app_context():
        marca_id = _marca(f"lc-reciproca-{entorno}-{_MARCA_DE_CORRIDA}")
        almacen = LocalStorage()
        ruta = almacen.save_brand_image(_imagen((123, 45, 67)), brand_id=marca_id)
        otra = almacen.save_brand_image(_imagen((7, 7, 7)), brand_id=marca_id)

        AdminBrandService.set_image(marca_id, ruta, administrator_id=entorno)
        AdminBrandImageService.add(
            marca_id, file_path=ruta, alt_text=None, administrator_id=entorno
        )

        # Se cambia el logotipo: el archivo lo sigue usando la pieza del collage.
        AdminBrandService.set_image(marca_id, otra, administrator_id=entorno)

        assert _existe(almacen, ruta), "se borró el archivo que aún usa el collage"


def test_reemplazar_el_logotipo_retira_el_anterior_si_nadie_lo_usa(entorno, app):
    with app.app_context():
        marca_id = _marca(f"lc-logo-{entorno}-{_MARCA_DE_CORRIDA}")
        almacen = LocalStorage()
        vieja = almacen.save_brand_image(_imagen((1, 2, 3)), brand_id=marca_id)
        nueva = almacen.save_brand_image(_imagen((250, 240, 230)), brand_id=marca_id)

        AdminBrandService.set_image(marca_id, vieja, administrator_id=entorno)
        AdminBrandService.set_image(marca_id, nueva, administrator_id=entorno)

        assert not _existe(almacen, vieja)
        assert _existe(almacen, nueva)


def test_el_recuento_de_referencias_cruza_las_dos_tablas(entorno, app):
    """La pieza que sostiene todo lo anterior, comprobada directamente."""
    with app.app_context():
        # Marca propia de la corrida: el recuento es exacto y no arrastra las
        # piezas que dejó una ejecución anterior (`AD-18`: no hay borrado físico).
        marca_id = _marca(f"lc-recuento-{entorno}-{_MARCA_DE_CORRIDA}")
        almacen = LocalStorage()
        ruta = almacen.save_brand_image(_imagen((60, 60, 60)), brand_id=marca_id)

        AdminBrandService.set_image(marca_id, ruta, administrator_id=entorno)
        pieza = AdminBrandImageService.add(
            marca_id, file_path=ruta, alt_text=None, administrator_id=entorno
        )

        # Excluyendo la pieza, queda el logotipo: 1.
        assert (
            AdminBrandImageRepository.count_live_references_to_path(
                ruta, excluding_image_id=pieza["id"]
            )
            == 1
        )
        # Excluyendo la marca, queda la pieza: 1.
        assert (
            AdminBrandImageRepository.count_live_references_to_brand_logo(
                ruta, excluding_brand_id=marca_id
            )
            == 1
        )


# ---------------------------------------------------------------------------
# Tienda
# ---------------------------------------------------------------------------


def test_reemplazar_la_foto_de_la_tienda_retira_la_anterior(entorno, app):
    with app.app_context():
        almacen = LocalStorage()
        vieja = almacen.save_store_image(_imagen((15, 25, 35)))
        nueva = almacen.save_store_image(_imagen((215, 225, 235)))

        StoreSettingService.set_about_image(vieja, administrator_id=entorno)
        StoreSettingService.set_about_image(nueva, administrator_id=entorno)

        assert not _existe(almacen, vieja)
        assert _existe(almacen, nueva)


def test_quitar_la_foto_de_la_tienda_retira_el_archivo(entorno, app):
    with app.app_context():
        almacen = LocalStorage()
        ruta = almacen.save_store_image(_imagen((99, 11, 22)))

        StoreSettingService.set_about_image(ruta, administrator_id=entorno)
        StoreSettingService.set_about_image(None, administrator_id=entorno)

        assert not _existe(almacen, ruta)


# ---------------------------------------------------------------------------
# El cleanup no puede tumbar una operación ya confirmada
# ---------------------------------------------------------------------------


def test_un_fallo_al_borrar_el_archivo_no_deshace_la_operacion(entorno, app, monkeypatch):
    """El borrado ocurre DESPUÉS del commit: si falla, deja un huérfano, no un 500.

    Un huérfano es recuperable; deshacer una baja que el administrador ya vio
    confirmada, no.
    """
    with app.app_context():
        almacen = LocalStorage()
        ruta = almacen.save_banner(_imagen((3, 130, 200)))

        from app.schemas.banner_schemas import BannerInput

        entrada = BannerInput(
            title=TITULO_DE_PRUEBA,
            subtitle=None,
            link_url=None,
            button_label=None,
            placement="hero",
            position=1,
            starts_at=None,
            ends_at=None,
            is_active=True,
        )
        dto = AdminBannerService.create(entrada, image_path=ruta, administrator_id=entorno)

        def explota(self, canonical_path):
            raise OSError("disco de solo lectura")

        monkeypatch.setattr(LocalStorage, "delete_derivative_set", explota)

        # No debe propagar: la fila ya quedó confirmada.
        AdminBannerService.delete(dto.id, administrator_id=entorno)

        assert _existe(almacen, ruta), "el borrado falló, el archivo sigue (huérfano)"
