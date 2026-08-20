"""Admin authentication rules (03_SEGURIDAD.md §5, §6, §7; 05_API.md §5.1, §9.1).

The service does not touch HTTP beyond the session object; it verifies
credentials and returns the administrator DTO that the route wraps (BK-05).

Session model (AD-37): the payload lives on the server and the cookie carries
only its identifier. Flask-Session with the SQLAlchemy backend provides that;
the plain Flask cookie would be a self-contained token, which AD-37 rejects.
"""

from datetime import UTC, datetime, timedelta

from flask import session

from ..core.decorators import transactional
from ..core.exceptions import AuthenticationError, AuthorizationError
from ..core.security.password import verify_password
from ..repositories.administrator_repository import AdministratorRepository

# SEG-01: 30 minutes of inactivity, 12 hours absolute.
IDLE_TIMEOUT = timedelta(minutes=30)
ABSOLUTE_TIMEOUT = timedelta(hours=12)

# 03_SEGURIDAD.md §16.1: hash bcrypt fijo y válido, contra el que se verifica
# cuando el usuario **no existe**. Sin esto, saltarse bcrypt en ese caso hacía
# la respuesta medible más rápida y revelaba por temporización qué nombres de
# usuario son reales. Es un hash de una cadena descartable: `checkpw` siempre
# devolverá `False`, su único fin es igualar el coste de cómputo.
_TIMING_EQUALIZER_HASH = "$2b$12$QxazlqgOEk5zD1qCIAcDKOihxwOOIMshf/rfZpQ.rgDNQJopVB1PG"

SUPER_ADMINISTRATOR = "super_administrator"


class AdminAuthService:
    SESSION_KEY = "admin_id"
    LOGGED_IN_AT = "logged_in_at"
    LAST_SEEN_AT = "last_seen_at"

    # ------------------------------------------------------------------
    # Login / logout
    # ------------------------------------------------------------------

    @classmethod
    @transactional
    def login(cls, username: str, password: str) -> dict:
        """Verifies credentials and opens a server-side session.

        The failure detail never says whether the username exists: 03_SEGURIDAD.md
        §16.1 forbids leaking that, and §5.3 only requires logging the attempt.

        El login no genera `audit_logs`: §14.1 de 04_BASE_DATOS.md acota la
        auditoría a las escrituras del panel (crear, editar, activar, desactivar,
        eliminar, cargar imagen, cambiar precio) y el conjunto cerrado de
        `action` no contempla el acceso. El intento se registra en el log
        estructurado (03_SEGURIDAD.md §5.3).
        """
        administrator = AdministratorRepository.find_by_username(username)

        if administrator is None:
            # Se ejecuta bcrypt igual que en el camino de contraseña incorrecta,
            # para no revelar por temporización que el usuario no existe.
            verify_password(password, _TIMING_EQUALIZER_HASH)
            raise AuthenticationError("invalid credentials")

        if not verify_password(password, administrator.password_hash):
            raise AuthenticationError("invalid credentials")

        administrator.last_login_at = datetime.now(UTC)

        session.clear()
        # SEG-02: each login is its own session with its own identifier.
        session[cls.SESSION_KEY] = administrator.id
        session[cls.LOGGED_IN_AT] = datetime.now(UTC).isoformat()
        session[cls.LAST_SEEN_AT] = datetime.now(UTC).isoformat()
        session.permanent = True

        return cls.to_dto(administrator)

    @classmethod
    def logout(cls) -> None:
        """§7.3: an explicit logout invalidates the session."""
        session.clear()

    # ------------------------------------------------------------------
    # Session state
    # ------------------------------------------------------------------

    @classmethod
    def current_administrator(cls):
        """Returns the live administrator model, or None when there is no session."""
        administrator_id = session.get(cls.SESSION_KEY)
        if not administrator_id:
            return None

        if cls._is_expired():
            session.clear()
            return None

        administrator = AdministratorRepository.find_by_id(administrator_id)
        # §7.3: deleting or deactivating the user invalidates the session.
        if administrator is None or not administrator.is_active:
            session.clear()
            return None

        session[cls.LAST_SEEN_AT] = datetime.now(UTC).isoformat()
        return administrator

    @classmethod
    def _is_expired(cls) -> bool:
        """SEG-01: idle timeout of 30 minutes, absolute expiry of 12 hours."""
        now = datetime.now(UTC)

        logged_in_at = cls._read_timestamp(cls.LOGGED_IN_AT)
        if logged_in_at is None or now - logged_in_at > ABSOLUTE_TIMEOUT:
            return True

        last_seen_at = cls._read_timestamp(cls.LAST_SEEN_AT)
        return last_seen_at is None or now - last_seen_at > IDLE_TIMEOUT

    @staticmethod
    def _read_timestamp(key: str) -> datetime | None:
        raw = session.get(key)
        if not raw:
            return None
        try:
            return datetime.fromisoformat(raw)
        except (TypeError, ValueError):
            return None

    # ------------------------------------------------------------------
    # Guards (PA-06: the backend imposes authorisation, never the frontend)
    # ------------------------------------------------------------------

    @classmethod
    def require_administrator(cls):
        """401 when there is no valid session (§6.2)."""
        administrator = cls.current_administrator()
        if administrator is None:
            raise AuthenticationError("session not found or expired")
        return administrator

    @classmethod
    def require_super_administrator(cls):
        """403 when the identity exists but lacks the role.

        §6.3: *"Un Administrador que intente acceder a un endpoint de
        Superadministrador recibe 403"*. A 401 here would be wrong: the caller is
        authenticated, it just is not allowed.
        """
        administrator = cls.require_administrator()
        if administrator.role != SUPER_ADMINISTRATOR:
            raise AuthorizationError("operation requires super_administrator role", rule="RN-67")
        return administrator

    # ------------------------------------------------------------------
    # Mapping
    # ------------------------------------------------------------------

    @staticmethod
    def to_dto(administrator) -> dict:
        """05_API.md §10.10. The password hash never leaves the server."""
        return {
            "id": administrator.id,
            "username": administrator.username,
            "email": administrator.email,
            "role": administrator.role,
            "is_active": administrator.is_active,
            "last_login_at": (
                administrator.last_login_at.isoformat() if administrator.last_login_at else None
            ),
        }
