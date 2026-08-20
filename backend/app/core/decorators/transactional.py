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

from functools import wraps

from ...extensions import db

_DEPTH_KEY = "transactional_depth"


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
            return result
        except Exception:
            # §14.3: rollback ante excepción. Incluye el registro de auditoría,
            # que nunca debe quedar huérfano (CONS-05).
            db.session.rollback()
            raise
        finally:
            # `commit()` y `rollback()` no vacían `info`, pero la sesión se
            # reutiliza en la siguiente petición del mismo contexto.
            db.session.info.pop(_DEPTH_KEY, None)

    return wrapper
