"""Audit trail (AD-20, 03_SEGURIDAD.md §13, 04_BASE_DATOS.md §14).

Toda operación de escritura del panel deja registro en `audit_logs`, en la
**misma transacción** que la operación (CONS-05, §14.3 regla 1). El registro es
inmutable: no se edita ni se elimina.

§14.3 regla 2 y PA-06: nunca se registran contraseñas, hashes, tokens ni
cabeceras de autenticación.
"""

from flask import has_request_context, request

from ...extensions import db
from ...models import AuditLog

# AD-20: conjunto cerrado de acciones.
ACTION_CREATE = "create"
ACTION_UPDATE = "update"
ACTION_DELETE = "delete"
ACTION_ACTIVATE = "activate"
ACTION_DEACTIVATE = "deactivate"

# §14.3 regla 2: estas claves jamás se serializan en el snapshot.
FORBIDDEN_FIELDS = frozenset(
    {"password", "password_hash", "csrf_token", "token", "secret", "authorization", "cookie"}
)


def _sanitise(values: dict | None) -> dict | None:
    """Descarta cualquier campo sensible antes de persistir el snapshot."""
    if not values:
        return None
    return {key: value for key, value in values.items() if key.lower() not in FORBIDDEN_FIELDS}


def _client_ip() -> str | None:
    if not has_request_context():
        return None
    # 03_SEGURIDAD.md §14.2: con ProxyFix, `request.remote_addr` ya es la IP
    # real del cliente, derivada **solo** de los proxies de confianza
    # (`TRUSTED_PROXY_COUNT`). Leer el `X-Forwarded-For` crudo era falsificable:
    # cualquier cliente podía anteponer una IP y forjar el registro de
    # auditoría. Ahora la fuente es única y confiable.
    return request.remote_addr


class AuditService:
    """Registra escrituras del panel. No hace commit: lo hace la transacción."""

    @staticmethod
    def record(
        *,
        administrator_id: int,
        action: str,
        entity_type: str,
        entity_id: int,
        old_values: dict | None = None,
        new_values: dict | None = None,
    ) -> AuditLog:
        """Añade el registro a la sesión abierta, sin cerrarla.

        El `commit` pertenece al servicio que realiza la escritura, de modo que
        auditoría y operación caigan o persistan juntas (CONS-05).
        """
        entry = AuditLog(
            administrator_id=administrator_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_values=_sanitise(old_values),
            new_values=_sanitise(new_values),
            ip_address=_client_ip(),
        )
        db.session.add(entry)
        return entry

    @staticmethod
    def snapshot(model, fields) -> dict:
        """Snapshot selectivo de una entidad (§14.2).

        Las marcas de tiempo se serializan a ISO para que quepan en JSONB.
        """
        values = {}
        for field in fields:
            value = getattr(model, field, None)
            values[field] = value.isoformat() if hasattr(value, "isoformat") else value
        return values
