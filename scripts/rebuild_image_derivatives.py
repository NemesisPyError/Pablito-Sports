"""Migra `images.file_path` a la estructura de 02_ARQUITECTURA.md §15.2.

Antes de esta tanda las cargas se guardaban planas en la raíz del volumen
(`<uuid>.<ext>`) y sin derivados. §15.2 separa original y derivados en ramas
distintas, y Nginx pasa a publicar **solo** la de derivados, de modo que las
rutas antiguas dejan de resolver.

Este script recorre `images`, localiza el archivo heredado, lo hace pasar por el
pipeline real —original a su rama, tres derivados a la suya (§15.4, §15.5)— y
reescribe `file_path`. Es idempotente: una fila ya migrada se salta.

`AD-38` permite regenerar derivados desde el original; lo que **no** se puede
inventar es un original que no existe. Esas filas se informan y no se tocan: es
una decisión de negocio si se recargan a mano o se dan por perdidas.

Uso:
    docker compose exec backend python /scripts/rebuild_image_derivatives.py
    docker compose exec backend python /scripts/rebuild_image_derivatives.py --dry-run
"""

import os
import sys

sys.path.insert(0, "/app")

from werkzeug.datastructures import FileStorage  # noqa: E402

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.infrastructure.storage.local_storage import (  # noqa: E402
    DERIVATIVES_DIR,
    PRODUCTS_NAMESPACE,
    LocalStorage,
)
from app.models import Image  # noqa: E402


def _already_migrated(file_path: str, storage: LocalStorage) -> bool:
    """Migrada es `products/<product_id>/<huella>-<ancho>.<ext>` y existe en disco.

    §17.1.5 añadió el espacio de nombres: una ruta sin él es anterior y hay que
    rehacerla aunque su archivo siga estando.
    """
    if not file_path.startswith(f"{PRODUCTS_NAMESPACE}/"):
        return False
    return os.path.exists(os.path.join(storage.derivatives_path, file_path))


def _legacy_source(image: Image, storage: LocalStorage) -> str | None:
    """Devuelve el original del que regenerar, si aún está en el volumen.

    Cubre los dos formatos heredados: el plano de la raíz, anterior a §15.2, y
    el de `originals/<product_id>/`, anterior al espacio de nombres de §17.1.5.
    """
    plano = os.path.join(storage.base_path, image.file_path)
    if os.path.isfile(plano) and DERIVATIVES_DIR not in plano:
        return plano

    sin_espacio = os.path.join(storage.originals_path, str(image.product_id))
    if os.path.isdir(sin_espacio):
        for nombre in sorted(os.listdir(sin_espacio)):
            if image.file_path.split("/")[-1].split("-")[0] == nombre.split(".")[0]:
                return os.path.join(sin_espacio, nombre)
    return None


def rebuild(dry_run: bool = False) -> int:
    storage = LocalStorage()
    migradas = saltadas = perdidas = 0

    for image in db.session.query(Image).order_by(Image.id):
        if _already_migrated(image.file_path, storage):
            saltadas += 1
            continue

        source = _legacy_source(image, storage)
        if source is None:
            perdidas += 1
            print(f"  SIN ORIGINAL  imagen {image.id} (producto {image.product_id}): {image.file_path}")
            continue

        if dry_run:
            print(f"  MIGRARIA      imagen {image.id}: {image.file_path}")
            migradas += 1
            continue

        with open(source, "rb") as handle:
            upload = FileStorage(stream=handle, filename=os.path.basename(source))
            image.file_path = storage.save(upload, product_id=image.product_id)
        migradas += 1
        print(f"  MIGRADA       imagen {image.id} -> {image.file_path}")

    if not dry_run:
        db.session.commit()

    print(f"\nmigradas: {migradas} · ya migradas: {saltadas} · sin original: {perdidas}")
    return perdidas


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    app = create_app()
    with app.app_context():
        perdidas = rebuild(dry_run=dry_run)
    if perdidas:
        print(
            "\nHay filas cuyo original ya no está en el volumen. No se pueden regenerar:\n"
            "hay que volver a cargar esas imágenes desde el panel."
        )


if __name__ == "__main__":
    main()
