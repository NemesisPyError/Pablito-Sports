"""Image storage on the persistent local volume (AD-05, DPL-04).

Estructura de directorios (02_ARQUITECTURA.md §15.2)::

    <UPLOAD_FOLDER>/
    ├── originals/<product_id>/<huella>.<ext>        ← AD-38, sin ruta pública
    └── derivatives/<product_id>/<huella>-<ancho>.<ext>  ← lo único que sirve Nginx

`AD-38`: el original es el activo autoritativo e irreproducible y **nunca se
sirve al cliente**; los derivados son caché regenerable. Por eso viven en ramas
separadas y solo la de derivados tiene ruta pública (`AD-04`, §15.2).

§15.3: el nombre lo genera el sistema (regla 1), incorpora una huella del
contenido para permitir cacheo indefinido (regla 2), y el derivado se nombra
como el original más el tamaño (regla 3).

Los valores concretos —anchos, formatos, nomenclatura y derivado canónico— los
fija `99_AI_DEVELOPMENT_GUIDE.md` §17.1 (decisión `AI-06`), que cierra `ADP-16`.
Esa convención es pública: el frontend construye el `srcset` a partir de ella
(§17.1.6) sin consultar la base de datos.

Validaciones según 03_SEGURIDAD.md §11. El tamaño máximo (§11.1, 5 MB) lo impone
Flask con `MAX_CONTENT_LENGTH` antes de llegar aquí: la petición se corta en 413
sin materializar el archivo.
"""

import contextlib
import hashlib
import logging
import os
import shutil
import uuid

from flask import current_app
from PIL import Image, UnidentifiedImageError

from ...core.exceptions import ValidationError
from .storage_interface import StorageInterface

logger = logging.getLogger("app.infrastructure.storage")

# §11.1: conjunto cerrado de tipos permitidos. §15.6 excluye SVG explícitamente:
# puede contener script y se sirve como documento.
ALLOWED_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp"})

# §11.1: dimensiones admitidas.
MIN_DIMENSION = 200
MAX_DIMENSION = 4000

# 99_AI_DEVELOPMENT_GUIDE.md §17.1 (`AI-06`). Cada espacio de nombres tiene sus
# anchos y su derivado canónico. Conjuntos cerrados: añadir uno exige modificar
# §17.1 antes que este módulo (§17.1.8 regla 5).
PRODUCTS_NAMESPACE = "products"
BANNERS_NAMESPACE = "banners"
BRANDS_NAMESPACE = "brands"
STORE_NAMESPACE = "store"

# §17.1.2. Productos: tres anchos de §15.5, con su consumidor aprobado.
PRODUCT_WIDTHS = {
    "thumbnail": 400,  # listados del panel
    "catalog": 800,  # tarjeta de producto
    "detail": 1600,  # ficha y galería
}

# §17.1.2. Banners: mayores, porque una pieza de portada se muestra a ancho
# completo, no dentro de una tarjeta.
BANNER_WIDTHS = {
    "thumbnail": 800,  # listado del panel
    "standard": 1600,  # portada en escritorio
    "wide": 2400,  # pantallas anchas y alta densidad
}

# §17.1.2. Marcas: el logotipo se dibuja pequeño y el collage ocupa media
# pantalla, de modo que el espacio cubre los dos usos con los mismos anchos.
BRAND_WIDTHS = {
    "thumbnail": 400,  # listado del panel y franja de marcas
    "standard": 800,  # logotipo del bloque y piezas del collage
    "detail": 1600,  # pieza grande del collage y alta densidad
}

# §17.1.2. Tienda: hoy solo la foto de «Nuestra historia». Dos anchos, no tres:
# tiene un único consumidor y una vista previa, e inventarle un tercero sería
# generar un archivo que nadie pide.
STORE_WIDTHS = {
    "thumbnail": 800,  # vista previa del panel
    "standard": 1600,  # sección de historia
}

# §17.1.6: el canónico es el **intermedio** donde hay tres anchos y el mayor
# donde hay dos. Es el que más se sirve; los otros se deducen del nombre
# (§15.3 regla 3).
NAMESPACES = {
    PRODUCTS_NAMESPACE: {"widths": PRODUCT_WIDTHS, "canonical": "catalog"},
    BANNERS_NAMESPACE: {"widths": BANNER_WIDTHS, "canonical": "standard"},
    BRANDS_NAMESPACE: {"widths": BRAND_WIDTHS, "canonical": "standard"},
    STORE_NAMESPACE: {"widths": STORE_WIDTHS, "canonical": "standard"},
}

# Excepción de fiabilidad a §17.1.6: el logotipo y el collage de marca
# publican el respaldo JPEG como canónico, no WebP. El WebP con alfa se
# sigue generando (queda en disco por si hace falta), pero se encontró en
# producción una franja real de navegadores (Brave con aceleración por GPU,
# confirmado) que decodifican mal el canal alfa de WebP y muestran el logo
# como un rectángulo negro sólido — el archivo es válido, es un problema del
# decoder del cliente, no del dato (confirmado con Pillow y con otro motor).
# El JPEG no tiene canal alfa: no hay nada que decodificar mal. Solo aplica a
# `brands`: hoy es el único espacio cuyo contenido es casi siempre logotipos
# con transparencia real mostrados sobre fondo claro, donde el respaldo
# compuesto sobre blanco (§15.6) se ve idéntico al WebP.
JPEG_CANONICAL_NAMESPACES = frozenset({BRANDS_NAMESPACE})

# Compatibilidad de nombre para el espacio de productos, que es el que existía
# antes de §17.1.2 y al que apuntan el frontend y los tests.
DERIVATIVE_WIDTHS = PRODUCT_WIDTHS
CANONICAL_DERIVATIVE = "catalog"

# §17.1.3, que materializa §15.6: WebP con respaldo tradicional en JPEG.
DERIVATIVE_FORMAT = ("webp", "WEBP")
FALLBACK_FORMAT = ("jpg", "JPEG")

ORIGINALS_DIR = "originals"
DERIVATIVES_DIR = "derivatives"

# §11.2: el MIME se determina por magic bytes, nunca por la extensión declarada.
_SIGNATURES = (
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
)

_HEADER_BYTES = 32

# Ancho de la huella de contenido. 16 hex son 64 bits: de sobra para que dos
# imágenes distintas no colisionen en un catálogo de este tamaño.
_FINGERPRINT_LENGTH = 16


class LocalStorage(StorageInterface):
    """Reads and writes under UPLOAD_FOLDER, mounted from a persistent volume."""

    def __init__(self, base_path: str | None = None):
        self._base_path = base_path

    @property
    def base_path(self) -> str:
        return self._base_path or current_app.config["UPLOAD_FOLDER"]

    @property
    def originals_path(self) -> str:
        return os.path.join(self.base_path, ORIGINALS_DIR)

    @property
    def derivatives_path(self) -> str:
        return os.path.join(self.base_path, DERIVATIVES_DIR)

    # ------------------------------------------------------------------
    # Carga
    # ------------------------------------------------------------------

    def save(self, file_storage, *, product_id: int) -> str:
        """Guarda la imagen de un producto (§17.1.5, espacio `products`)."""
        return self._store(file_storage, namespace=PRODUCTS_NAMESPACE, group=str(product_id))

    def save_banner(self, file_storage) -> str:
        """Guarda la imagen de un banner (§17.1.5, espacio `banners`).

        El espacio de banners es **plano**: un banner es una pieza suelta, sin
        agregado que lo agrupe, a diferencia del producto que agrupa su galería.
        """
        return self._store(file_storage, namespace=BANNERS_NAMESPACE, group=None)

    def save_brand_image(self, file_storage, *, brand_id: int) -> str:
        """Guarda logotipo o pieza de collage de una marca (espacio `brands`).

        Se agrupa por marca, como productos: el logotipo y las piezas del
        collage pertenecen al mismo agregado y conviene que se borren y se
        inspeccionen juntos.
        """
        return self._store(file_storage, namespace=BRANDS_NAMESPACE, group=str(brand_id))

    def save_store_image(self, file_storage) -> str:
        """Guarda la foto de «Nuestra historia» (espacio `store`).

        Plano, como banners: hay una sola pieza y ningún agregado que la
        agrupe.
        """
        return self._store(file_storage, namespace=STORE_NAMESPACE, group=None)

    def _store(self, file_storage, *, namespace: str, group: str | None) -> str:
        """Valida, guarda el original y genera los derivados (§15.4).

        Devuelve la ruta del derivado canónico **relativa a la rama de
        derivados**, que es la raíz que Nginx publica. El original no tiene ruta
        pública (`AD-38`, §15.2).
        """
        configuracion = NAMESPACES[namespace]
        widths = configuracion["widths"]

        canonical_extension = self._validate(file_storage)

        content = file_storage.stream.read()
        file_storage.stream.seek(0)
        fingerprint = hashlib.sha256(content).hexdigest()[:_FINGERPRINT_LENGTH]

        # §17.1.5: `<rama>/<espacio>[/<grupo>]/`. El grupo solo existe donde hay
        # algo que agrupar.
        relativo = namespace if group is None else os.path.join(namespace, group)
        original_dir = os.path.join(self.originals_path, relativo)
        derivative_dir = os.path.join(self.derivatives_path, relativo)
        os.makedirs(original_dir, exist_ok=True)
        os.makedirs(derivative_dir, exist_ok=True)

        # AD-40: el archivo se escribe antes que la fila. AD-38: el original se
        # persiste sin alterar.
        original_file = os.path.join(original_dir, f"{fingerprint}{canonical_extension}")
        with open(original_file, "wb") as handle:
            handle.write(content)

        written = [original_file]
        try:
            # §15.4: generación sincrónica (IM-01). Si un derivado falla, falla
            # la carga completa: preferible a una fila cuyos derivados no existen.
            written += self._generate_derivatives(
                original_file, derivative_dir, fingerprint, widths
            )
        except Exception:
            for path in written:
                with contextlib.suppress(OSError):
                    os.remove(path)
            logger.exception(
                "derivative generation failed", extra={"namespace": namespace, "group": group}
            )
            raise

        canonical_width = widths[configuracion["canonical"]]
        prefijo = namespace if group is None else f"{namespace}/{group}"
        derivative_extension = (
            FALLBACK_FORMAT[0] if namespace in JPEG_CANONICAL_NAMESPACES else DERIVATIVE_FORMAT[0]
        )
        return f"{prefijo}/{fingerprint}-{canonical_width}.{derivative_extension}"

    def _generate_derivatives(
        self, original_file: str, derivative_dir: str, fingerprint: str, widths: dict
    ) -> list[str]:
        """§17.1.2 y §17.1.3: los anchos del espacio, WebP con respaldo JPEG.

        La altura es proporcional: recortar sería decidir el encuadre por quien
        cargó la foto. Una imagen más estrecha que el objetivo no se amplía; se
        copia a su tamaño real, porque agrandar no añade información.

        El derivado WebP conserva transparencia real cuando la fuente la
        tiene: un logo con canal alfa debe verse igual sobre una superficie
        clara que sobre una oscura, sin caja de color detrás (`UDS-09`,
        `MediaTile`). `Image.convert("RGB")` sobre una fuente con alfa no
        compone nada: descarta el canal y expone el color que hubiera debajo
        de cada píxel transparente, que es arbitrario y depende de cómo se
        exportó el archivo — de ahí que dos logos con transparencia real
        terminaran, uno sobre blanco y otro sobre negro, sin que el archivo
        de origen tuviera nada mal. El respaldo JPEG sí necesita aplanarse
        —el formato no admite alfa, es una limitación real, no una decisión
        de diseño— y se compone explícitamente sobre blanco con la máscara
        de alfa, en vez de descartarla.
        """
        written: list[str] = []
        with Image.open(original_file) as source:
            has_alpha = source.mode in ("RGBA", "LA") or (
                source.mode == "P" and "transparency" in source.info
            )

            if has_alpha:
                source_rgba = source.convert("RGBA")
                source_rgb = Image.new("RGB", source_rgba.size, (255, 255, 255))
                source_rgb.paste(source_rgba, mask=source_rgba.split()[3])
            else:
                source_rgba = None
                source_rgb = source.convert("RGB")

            for width in widths.values():
                target_width = min(width, source.width)
                target_height = max(1, round(source.height * target_width / source.width))
                size = (target_width, target_height)
                resized_rgb = source_rgb.resize(size, Image.LANCZOS)
                resized_rgba = source_rgba.resize(size, Image.LANCZOS) if source_rgba else None

                for extension, image_format in (DERIVATIVE_FORMAT, FALLBACK_FORMAT):
                    path = os.path.join(derivative_dir, f"{fingerprint}-{width}.{extension}")
                    is_alpha_webp = image_format == "WEBP" and resized_rgba
                    saved = resized_rgba if is_alpha_webp else resized_rgb
                    # El WebP con alfa se guarda `lossless`: es contenido tipo
                    # logo (colores planos, bordes nítidos), donde lossless no
                    # pesa mucho más que lossy, y evita una franja real de
                    # navegadores que renderizan mal el alfa de WebP con
                    # pérdida (visto en producción: el archivo es válido —
                    # Pillow y algunos motores lo decodifican bien— pero
                    # Brave lo mostraba como un rectángulo negro sólido).
                    save_kwargs = {"lossless": True} if is_alpha_webp else {"quality": 82}
                    saved.save(path, format=image_format, **save_kwargs)
                    written.append(path)
        return written

    # ------------------------------------------------------------------
    # Validación (§11)
    # ------------------------------------------------------------------

    def _validate(self, file_storage) -> str:
        declared = (file_storage.filename or "").strip()
        if not declared:
            raise ValidationError("uploaded file has no name", field="file")

        # §11.2: rechazo de doble extensión (`foto.jpg.php`).
        stem, _, extension = declared.rpartition(".")
        if not stem or "." in stem:
            raise ValidationError("file name must have a single extension", field="file")
        if f".{extension.lower()}" not in ALLOWED_EXTENSIONS:
            raise ValidationError(
                "file extension must be one of " + ", ".join(sorted(ALLOWED_EXTENSIONS)),
                field="file",
            )

        header = file_storage.stream.read(_HEADER_BYTES)
        file_storage.stream.seek(0)
        canonical_extension = self._extension_from_signature(header)
        if canonical_extension is None:
            raise ValidationError("file content is not a supported image", field="file")

        self._verify_image(file_storage)
        return canonical_extension

    @staticmethod
    def _extension_from_signature(header: bytes) -> str | None:
        """§11.2: MIME por magic bytes, no por la extensión declarada."""
        for signature, _mime, extension in _SIGNATURES:
            if header.startswith(signature):
                return extension
        # WebP no tiene firma contigua: es un contenedor RIFF con el marcador del
        # formato en el cuarto bloque de cuatro bytes.
        if header[:4] == b"RIFF" and header[8:12] == b"WEBP":
            return ".webp"
        return None

    @staticmethod
    def _verify_image(file_storage) -> None:
        """§11.1 dimensiones y §11.2 "el archivo es una imagen válida".

        La firma solo demuestra que los primeros bytes son correctos. Abrir la
        imagen es lo que descarta un archivo truncado o manipulado que empieza
        bien y sigue con cualquier cosa.
        """
        try:
            with Image.open(file_storage.stream) as image:
                image_format = image.format
                width, height = image.size
                # `verify` recorre el archivo entero y deja el objeto
                # inutilizable, así que va después de leer formato y tamaño.
                image.verify()
        except (UnidentifiedImageError, OSError, ValueError) as error:
            raise ValidationError("file content is not a valid image", field="file") from error
        finally:
            file_storage.stream.seek(0)

        if image_format not in {"JPEG", "PNG", "WEBP"}:
            raise ValidationError("file content is not a supported image", field="file")
        if width < MIN_DIMENSION or height < MIN_DIMENSION:
            raise ValidationError(
                f"image must be at least {MIN_DIMENSION}x{MIN_DIMENSION} pixels", field="file"
            )
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            raise ValidationError(
                f"image must be at most {MAX_DIMENSION}x{MAX_DIMENSION} pixels", field="file"
            )

    # ------------------------------------------------------------------
    # Diagnóstico
    # ------------------------------------------------------------------

    def is_writable(self) -> bool:
        """Writes, reads back and removes a probe file inside the volume."""
        probe = os.path.join(self.base_path, f".healthcheck-{uuid.uuid4().hex}")
        try:
            os.makedirs(self.base_path, exist_ok=True)
            with open(probe, "w", encoding="utf-8") as handle:
                handle.write("ok")
            with open(probe, encoding="utf-8") as handle:
                return handle.read() == "ok"
        except OSError:
            logger.exception("storage write check failed")
            return False
        finally:
            with contextlib.suppress(OSError):
                os.remove(probe)

    def purge_product(self, product_id: int) -> None:
        """Retira original y derivados de un producto. Solo para herramientas.

        `AD-18` prohíbe el borrado físico de entidades de negocio; esto opera
        sobre archivos, no sobre filas, y existe para los scripts de
        mantenimiento y la limpieza de pruebas.
        """
        for branch in (self.originals_path, self.derivatives_path):
            shutil.rmtree(
                os.path.join(branch, PRODUCTS_NAMESPACE, str(product_id)), ignore_errors=True
            )

    def purge_brand(self, brand_id: int) -> None:
        """Retira logotipo y collage de una marca. Solo para herramientas.

        Mismo alcance y mismas salvedades que `purge_product`: opera sobre
        archivos, no sobre filas.
        """
        for branch in (self.originals_path, self.derivatives_path):
            shutil.rmtree(os.path.join(branch, BRANDS_NAMESPACE, str(brand_id)), ignore_errors=True)
