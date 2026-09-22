"""Reprocesa logotipos y piezas de marca ya cargados (99_AI_DEVELOPMENT_GUIDE.md §17.1.6).

`local_storage.py` cambió qué extensión es el canónico de `brands` cuando la
fuente tiene alfa real: antes siempre JPEG (compuesto sobre blanco — de ahí el
rectángulo blanco alrededor del logotipo sobre la franja oscura), ahora PNG con
transparencia real si la fuente la tiene. Ese cambio de código solo afecta
cargas **nuevas**: una fila ya guardada en `brands.image_path` /
`brand_images.file_path` sigue apuntando al archivo que se calculó cuando se
cargó, así que no se entera del cambio sola.

Este script recorre `Brand.image_path` y `BrandImage.file_path`, localiza el
original de cada uno (`AD-38`: nunca se toca, solo se lee) y lo vuelve a hacer
pasar por el pipeline real (`LocalStorage.save_brand_image`), que:

  - regenera los tres derivados de siempre, más el PNG con alfa si corresponde
    (nada se borra: los derivados viejos quedan hasta que nada los referencia,
    igual que cualquier otra carga);
  - devuelve la ruta canónica actualizada, que se escribe en la fila SOLO si
    cambió.

Es idempotente: una fila cuyo canónico ya es el correcto (o cuya fuente no
tiene alfa) se saltea sin tocar nada.

Uso:
    docker compose exec backend python /scripts/regenerate_brand_alpha_derivatives.py
    docker compose exec backend python /scripts/regenerate_brand_alpha_derivatives.py --dry-run
"""

import os
import sys

sys.path.insert(0, "/app")

from werkzeug.datastructures import FileStorage  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.infrastructure.storage.local_storage import BRANDS_NAMESPACE, LocalStorage  # noqa: E402
from app.models.classification import Brand, BrandImage  # noqa: E402


def _find_original(storage: LocalStorage, brand_id: int, canonical_path: str) -> str | None:
    """Busca `originals/brands/<brand_id>/<huella>.<ext>` a partir del canónico.

    La huella es el primer segmento del nombre de archivo (§15.3 regla 2); la
    extensión del original puede no coincidir con la del derivado (§15.6: se
    sube PNG, el derivado puede ser JPEG).
    """
    nombre = os.path.basename(canonical_path)
    huella = nombre.split("-")[0]
    carpeta = os.path.join(storage.originals_path, BRANDS_NAMESPACE, str(brand_id))
    if not os.path.isdir(carpeta):
        return None
    for archivo in os.listdir(carpeta):
        if archivo.rsplit(".", 1)[0] == huella:
            return os.path.join(carpeta, archivo)
    return None


def _reprocess(storage: LocalStorage, brand_id: int, canonical_path: str) -> str | None:
    """Vuelve a pasar el original por el pipeline. `None` si no se pudo."""
    original = _find_original(storage, brand_id, canonical_path)
    if original is None:
        return None
    with open(original, "rb") as handle:
        upload = FileStorage(stream=handle, filename=os.path.basename(original))
        return storage.save_brand_image(upload, brand_id=brand_id)


def _procesar_filas(rows, *, storage, dry_run, etiqueta):
    actualizadas = saltadas = perdidas = 0
    for row in rows:
        ruta_actual = row.image_path if hasattr(row, "image_path") else row.file_path
        if not ruta_actual:
            saltadas += 1
            continue

        brand_id = row.id if isinstance(row, Brand) else row.brand_id

        if dry_run:
            original = _find_original(storage, brand_id, ruta_actual)
            if original is None:
                perdidas += 1
                print(f"  SIN ORIGINAL  {etiqueta} {row.id} (marca {brand_id}): {ruta_actual}")
            else:
                print(f"  REVISARÍA     {etiqueta} {row.id} (marca {brand_id}): {ruta_actual}")
            continue

        nueva_ruta = _reprocess(storage, brand_id, ruta_actual)
        if nueva_ruta is None:
            perdidas += 1
            print(f"  SIN ORIGINAL  {etiqueta} {row.id} (marca {brand_id}): {ruta_actual}")
            continue

        if nueva_ruta == ruta_actual:
            saltadas += 1
            continue

        if isinstance(row, Brand):
            row.image_path = nueva_ruta
        else:
            row.file_path = nueva_ruta
        actualizadas += 1
        print(f"  ACTUALIZADA   {etiqueta} {row.id}: {ruta_actual} -> {nueva_ruta}")

    return actualizadas, saltadas, perdidas


def regenerate(dry_run: bool = False) -> int:
    storage = LocalStorage()

    logos = db.session.query(Brand).filter(Brand.image_path.isnot(None)).order_by(Brand.id)
    piezas = db.session.query(BrandImage).order_by(BrandImage.id)

    act_logos, salt_logos, perd_logos = _procesar_filas(
        logos, storage=storage, dry_run=dry_run, etiqueta="logotipo de marca"
    )
    act_piezas, salt_piezas, perd_piezas = _procesar_filas(
        piezas, storage=storage, dry_run=dry_run, etiqueta="pieza de collage"
    )

    if not dry_run:
        db.session.commit()

    actualizadas = act_logos + act_piezas
    saltadas = salt_logos + salt_piezas
    perdidas = perd_logos + perd_piezas
    print(f"\nactualizadas: {actualizadas} · ya al día: {saltadas} · sin original: {perdidas}")
    return perdidas


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    app = create_app()
    with app.app_context():
        perdidas = regenerate(dry_run=dry_run)
    if perdidas:
        print(
            "\nHay filas cuyo original ya no está en el volumen. No se pueden regenerar:\n"
            "hay que volver a cargar esas imágenes desde el panel."
        )


if __name__ == "__main__":
    main()
