"""Acceso al almacén de sesiones de servidor (03_SEGURIDAD.md §7.3).

§7.3 obliga a invalidar la sesión cuando cambia la contraseña del usuario o
cuando se le elimina o desactiva. Las dos últimas ya se resuelven solas —
`AdminAuthService.current_administrator()` relee al administrador en cada
petición y cierra la sesión si está inactivo o eliminado—, pero un cambio de
contraseña no altera nada que esa comprobación mire: hay que retirar las
sesiones abiertas.

`AD-37` guarda la sesión en la base, así que esto es acceso a datos y vive en
`repositories/` (`DEP-03`), no en `infrastructure/`.

**Acoplamiento declarado.** La tabla `sessions` la declara Flask-Session, no
nuestros modelos, y su columna `data` está serializada. Se usan el modelo y el
serializador que la extensión publica en `app.session_interface`. Si la
extensión cambiara esos atributos, este módulo es el único punto a tocar.
"""

from flask import current_app
from sqlalchemy import select

from ..extensions import db

# Clave con la que `AdminAuthService` guarda la identidad en la sesión.
SESSION_ADMIN_KEY = "admin_id"


class SessionRepository:
    @classmethod
    def delete_for_administrator(cls, administrator_id: int) -> int:
        """Retira las sesiones abiertas de un administrador. Devuelve cuántas.

        No hace `commit`: la invalidación pertenece a la transacción de la
        operación que la motiva, para que ambas caigan o persistan juntas.
        """
        interface = current_app.session_interface
        model = getattr(interface, "sql_session_model", None)
        serializer = getattr(interface, "serializer", None)
        if model is None or serializer is None:
            # Backend de sesión sin almacén consultable (por ejemplo, en un test
            # que use el interfaz por defecto). No hay nada que invalidar.
            return 0

        retiradas = 0
        for record in db.session.execute(select(model)).scalars().all():
            if cls._belongs_to(record, serializer, administrator_id):
                db.session.delete(record)
                retiradas += 1

        if retiradas:
            db.session.flush()
        return retiradas

    @staticmethod
    def _belongs_to(record, serializer, administrator_id: int) -> bool:
        """Una sesión ilegible se ignora: no se puede afirmar de quién es."""
        raw = record.data
        if raw is None:
            return False
        if isinstance(raw, str):
            raw = raw.encode("utf-8")
        try:
            payload = serializer.decode(raw)
        except Exception:  # noqa: BLE001 - formato desconocido o dato corrupto
            return False
        return isinstance(payload, dict) and payload.get(SESSION_ADMIN_KEY) == administrator_id
