"""Gestión de usuarios administradores (05_API.md §9.14, `CU-A-26`, `CU-A-27`).

Reglas que materializa:

- `RN-67` — solo el Superadministrador gestiona usuarios. La guarda vive en la
  ruta (`PA-06`); aquí se aplican las reglas que la guarda no puede ver.
- `RN-71` — no se puede eliminar ni desactivar al último superadministrador
  activo. Incluye degradarlo de rol, que lo deja igual de descabezado.
- `RN-72` — un usuario no puede eliminarse a sí mismo.

Toda escritura corre bajo `@transactional` (10_BACKEND.md §14.1) y deja registro
en `audit_logs` dentro de la misma transacción (`AD-20`, `CONS-05`).
"""

from ..core.audit import (
    ACTION_ACTIVATE,
    ACTION_CREATE,
    ACTION_DEACTIVATE,
    ACTION_DELETE,
    ACTION_UPDATE,
    AuditService,
)
from ..core.decorators import transactional
from ..core.exceptions import (
    AuthenticationError,
    AuthorizationError,
    BusinessRuleError,
    NotFoundError,
    RequestValidationError,
)
from ..core.security.password import hash_password, verify_password
from ..core.utils.pagination import Page
from ..mappers.admin_mappers import administrator_to_dto
from ..repositories.administrator_repository import AdministratorRepository
from ..repositories.session_repository import SessionRepository

SUPER_ADMINISTRATOR = "super_administrator"

ENTITY_TYPE = "administrator"

# §14.2: snapshot selectivo. `password_hash` no entra nunca (§14.3 regla 2), ni
# siquiera saneado: no se recoge.
AUDIT_FIELDS = ("username", "email", "role", "is_active", "deleted_at")


class AdminUserService:
    # ------------------------------------------------------------------
    # Lectura
    # ------------------------------------------------------------------

    @classmethod
    def list_paginated(cls, page_request) -> Page:
        """§9.14. Array de `AdministratorDTO`."""
        total = AdministratorRepository.count_all()
        administradores = AdministratorRepository.list_all(
            offset=page_request.offset, limit=page_request.limit
        )
        return Page(
            items=[administrator_to_dto(item) for item in administradores],
            page=page_request.page,
            per_page=page_request.per_page,
            total=total,
        )

    @classmethod
    def get_by_id(cls, administrator_id: int):
        administrador = cls._require(administrator_id)
        return administrator_to_dto(administrador)

    # ------------------------------------------------------------------
    # Escritura
    # ------------------------------------------------------------------

    @classmethod
    @transactional
    def create(cls, entrada, *, administrator_id: int):
        """§9.14 `POST /users`. Devuelve `AdministratorDTO` (201)."""
        cls._check_unique(entrada.username, entrada.email)

        administrador = AdministratorRepository.create(
            username=entrada.username,
            email=entrada.email,
            # §5.5: solo se almacena el hash, nunca la contraseña.
            password_hash=hash_password(entrada.password),
            role=entrada.role,
            is_active=True,
        )
        dto = administrator_to_dto(administrador)
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_CREATE,
            entity_type=ENTITY_TYPE,
            entity_id=administrador.id,
            new_values=AuditService.snapshot(administrador, AUDIT_FIELDS),
        )
        return dto

    @classmethod
    @transactional
    def update(cls, target_id: int, entrada, *, administrator_id: int):
        """§9.14 `PUT /users/{id}`. Reemplazo completo del perfil."""
        administrador = cls._require(target_id)
        cls._check_unique(entrada.username, entrada.email, exclude_id=target_id)

        # RN-71: dejar la instalación sin superadministrador activo es lo que la
        # regla impide, y se llega ahí por dos caminos: desactivándolo o
        # degradando su rol. Ambos se comprueban antes de tocar nada.
        pierde_privilegio = (
            administrador.role == SUPER_ADMINISTRATOR and entrada.role != SUPER_ADMINISTRATOR
        )
        se_desactiva = administrador.is_active and not entrada.is_active
        if (pierde_privilegio or se_desactiva) and cls._es_ultimo_super(administrador):
            raise BusinessRuleError(
                "cannot leave the installation without an active super administrator",
                rule="RN-71",
            )

        old_values = AuditService.snapshot(administrador, AUDIT_FIELDS)
        administrador = AdministratorRepository.update(
            administrador,
            username=entrada.username,
            email=entrada.email,
            role=entrada.role,
            is_active=entrada.is_active,
        )

        if se_desactiva:
            # §7.3: la desactivación invalida la sesión del usuario.
            SessionRepository.delete_for_administrator(target_id)

        dto = administrator_to_dto(administrador)
        AuditService.record(
            administrator_id=administrator_id,
            action=cls._accion_de_actualizacion(old_values, administrador),
            entity_type=ENTITY_TYPE,
            entity_id=administrador.id,
            old_values=old_values,
            new_values=AuditService.snapshot(administrador, AUDIT_FIELDS),
        )
        return dto

    @classmethod
    @transactional
    def delete(cls, target_id: int, *, administrator_id: int) -> None:
        """§9.14 `DELETE /users/{id}` → 204. Borrado lógico (`AD-18`)."""
        administrador = cls._require(target_id)

        # RN-72: un usuario no puede eliminarse a sí mismo.
        if target_id == administrator_id:
            raise BusinessRuleError("an administrator cannot delete itself", rule="RN-72")

        # RN-71: ni siquiera otro superadministrador puede retirar al último.
        if administrador.role == SUPER_ADMINISTRATOR and cls._es_ultimo_super(administrador):
            raise BusinessRuleError(
                "cannot delete the last active super administrator", rule="RN-71"
            )

        old_values = AuditService.snapshot(administrador, AUDIT_FIELDS)
        AdministratorRepository.soft_delete(administrador)
        # §7.3: la eliminación invalida la sesión del usuario.
        SessionRepository.delete_for_administrator(target_id)

        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_DELETE,
            entity_type=ENTITY_TYPE,
            entity_id=target_id,
            old_values=old_values,
            new_values=AuditService.snapshot(administrador, AUDIT_FIELDS),
        )

    @classmethod
    @transactional
    def change_password(
        cls, target_id: int, entrada, *, administrator_id: int, is_super_administrator: bool
    ) -> None:
        """§9.14 `POST /users/{id}/change-password` → 204.

        Propia, o de otro usuario si quien la ejecuta es superadministrador.
        `current_password` solo se exige —y solo se comprueba— en el primer caso;
        §9.14 dice explícitamente que se ignora en el segundo.
        """
        es_propia = target_id == administrator_id

        if not es_propia and not is_super_administrator:
            # §6.3: identidad válida pero sin permiso.
            raise AuthorizationError(
                "changing another administrator's password requires super_administrator role",
                rule="RN-67",
            )

        administrador = cls._require(target_id)

        if es_propia:
            if not entrada.current_password:
                raise RequestValidationError(
                    [{"field": "current_password", "detail": "current_password is required"}]
                )
            if not verify_password(entrada.current_password, administrador.password_hash):
                # §16.1: el detalle no distingue entre "no coincide" y otra cosa.
                raise AuthenticationError("invalid credentials")

        old_values = AuditService.snapshot(administrador, AUDIT_FIELDS)
        AdministratorRepository.update(
            administrador, password_hash=hash_password(entrada.new_password)
        )

        # §7.3: el cambio de contraseña invalida las sesiones del usuario. La
        # propia incluida: quien la cambia vuelve a autenticarse.
        SessionRepository.delete_for_administrator(target_id)

        # El snapshot no lleva la contraseña ni su hash (§14.3 regla 2), de modo
        # que el registro dice *que* cambió, no *a qué* cambió.
        AuditService.record(
            administrator_id=administrator_id,
            action=ACTION_UPDATE,
            entity_type=ENTITY_TYPE,
            entity_id=target_id,
            old_values=old_values,
            new_values=AuditService.snapshot(administrador, AUDIT_FIELDS),
        )

    # ------------------------------------------------------------------
    # Reglas auxiliares
    # ------------------------------------------------------------------

    @classmethod
    def _require(cls, administrator_id: int):
        administrador = AdministratorRepository.find_by_id(administrator_id)
        if administrador is None:
            raise NotFoundError("administrator not found", resource="administrator")
        return administrador

    @classmethod
    def _es_ultimo_super(cls, administrador) -> bool:
        """RN-71: ¿quedaría algún superadministrador activo sin este?"""
        if administrador.role != SUPER_ADMINISTRATOR or not administrador.is_active:
            return False
        return (
            AdministratorRepository.count_active_super_administrators(exclude_id=administrador.id)
            == 0
        )

    @classmethod
    def _check_unique(cls, username: str, email: str, *, exclude_id: int | None = None) -> None:
        """Unicidad de `username` y `email`, incluidas las filas eliminadas.

        Se responde `422` y no `409`: 05_API.md §10.10 lo declara una validación
        del DTO, y §11 exige que todo `409` cite el `RN-xx` violado — no existe
        ninguna regla de negocio sobre la unicidad de estos campos.
        """
        errores = []
        if AdministratorRepository.find_by_username_including_deleted(
            username, exclude_id=exclude_id
        ):
            errores.append({"field": "username", "detail": "username already in use"})
        if AdministratorRepository.find_by_email_including_deleted(email, exclude_id=exclude_id):
            errores.append({"field": "email", "detail": "email already in use"})
        if errores:
            raise RequestValidationError(errores)

    @classmethod
    def _accion_de_actualizacion(cls, old_values: dict, administrador) -> str:
        """El conjunto de `action` es cerrado (03_SEGURIDAD.md §13.2).

        Un cambio de estado se registra como `activate`/`deactivate`, que es más
        preciso que `update` y sigue dentro del conjunto aprobado.
        """
        if old_values["is_active"] != administrador.is_active:
            return ACTION_ACTIVATE if administrador.is_active else ACTION_DEACTIVATE
        return ACTION_UPDATE
