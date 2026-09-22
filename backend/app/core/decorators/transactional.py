"""Frontera transaccional explícita (10_BACKEND.md §14.1, regla 2).

§14.1 regla 1: *"Cada operación de escritura en un servicio corre dentro de una
transacción SQLAlchemy"*. §14.3: la transacción termina en `commit()` o en
`rollback()` ante excepción.

**Por qué existe este decorador.** Sin él, ningún servicio administrativo cerraba
su transacción: se limitaban a `flush()`. Los cambios persistían igualmente
porque `Flask-Session` con backend SQLAlchemy comparte la sesión de la
aplicación (`SESSION_SQLALCHEMY = db`) y hace `commit()` al guardar la sesión de
usuario, ya en la fase de respuesta. Ese commit implícito confirmaba también las
escrituras a medias de una petición que había terminado en error. `CONS-05` es
incompatible con eso: la auditoría solo vale si cae o persiste junto a la
operación, y eso exige una frontera que el servicio controle.

**Anidamiento.** Un servicio puede llamar a otro servicio transaccional. Solo la
llamada más externa abre y cierra la transacción; las internas se suman a la que
ya está abierta (una sola unidad de trabajo, §14.1 regla 1). El contador vive en
`db.session.info`, cuyo alcance es exactamente el de la sesión que se confirma.
"""

import logging
from functools import wraps

from ...extensions import db

logger = logging.getLogger("app.storage")

_DEPTH_KEY = "transactional_depth"

# S-13: archivos que deben desaparecer del disco **si y solo si** la transacción
# confirma. Ver `schedule_file_deletion`.
_FILES_KEY = "files_to_delete"


def schedule_file_deletion(canonical_path: str) -> None:
    """Marca un archivo para que se borre del disco al confirmar la transacción.

    **Por qué después del commit y no antes.** El orden inverso al del alta, que
    escribe el archivo antes que la fila (`AD-40`). Al borrar, si se desenlazara
    primero y la transacción luego hiciera rollback, quedaría una fila viva
    apuntando a un archivo que ya no existe: una imagen rota en el catálogo.
    Haciéndolo después, el peor caso es un archivo huérfano —invisible, sin fila
    que lo referencie, y recuperable— que además queda registrado.

    Es idempotente por ruta: pedir dos veces el mismo borrado en una transacción
    lo hace una sola vez.
    """
    pendientes = db.session.info.setdefault(_FILES_KEY, [])
    if canonical_path and canonical_path not in pendientes:
        pendientes.append(canonical_path)


def _borrar_archivos_pendientes() -> None:
    """Ejecuta los borrados marcados. Nunca propaga: la escritura ya se confirmó."""
    pendientes = db.session.info.pop(_FILES_KEY, [])
    if not pendientes:
        return

    from ...infrastructure.storage import LocalStorage

    almacen = LocalStorage()
    for ruta in pendientes:
        try:
            borrados = almacen.delete_derivative_set(ruta)
            logger.info("stored files removed", extra={"removed": borrados})
        except Exception:
            # Un huérfano es preferible a deshacer una operación ya confirmada.
            logger.exception("stored file removal failed")


def transactional(func):
    """Envuelve un método de servicio de escritura en una única transacción.

    Se aplica **por debajo** de `@classmethod`::

        @classmethod
        @transactional
        def create(cls, payload, *, administrator_id): ...
    """

    @wraps(func)
    def wrapper(*args, **kwargs):
        info = db.session.info
        depth = info.get(_DEPTH_KEY, 0)

        if depth:
            # Transacción ya abierta por un servicio externo: no se cierra aquí.
            info[_DEPTH_KEY] = depth + 1
            try:
                return func(*args, **kwargs)
            finally:
                info[_DEPTH_KEY] -= 1

        info[_DEPTH_KEY] = 1
        try:
            result = func(*args, **kwargs)
            db.session.commit()
            # S-13: sólo acá, con la transacción ya confirmada, se tocan los
            # archivos. Si el commit falla no se borra nada.
            _borrar_archivos_pendientes()
            return result
        except Exception:
            # §14.3: rollback ante excepción. Incluye el registro de auditoría,
            # que nunca debe quedar huérfano (CONS-05).
            db.session.rollback()
            db.session.info.pop(_FILES_KEY, None)
            raise
        finally:
            # `commit()` y `rollback()` no vacían `info`, pero la sesión se
            # reutiliza en la siguiente petición del mismo contexto.
            db.session.info.pop(_DEPTH_KEY, None)
            db.session.info.pop(_FILES_KEY, None)

    return wrapper
