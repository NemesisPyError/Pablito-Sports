"""Usuarios administradores (05_API.md §9.14, `RN-67`, `RN-71`, `RN-72`).

Los tests operan sobre administradores creados por ellos mismos, nunca sobre la
semilla de la migración: así no dependen del orden de ejecución ni del estado
que deje otra batería (11_TESTING.md §9.1).
"""

import secrets

import pytest
from sqlalchemy import text

from app.core.security.password import verify_password
from app.extensions import db
from app.models import Administrator

PREFIJO = "users-test"

# Se generan en cada ejecución: 03_SEGURIDAD.md §18.2 prohíbe versionar
# contraseñas, y una constante literal aquí lo sería aunque solo sirviera para
# pruebas. El valor queda en memoria para poder verificarlo.
PASSWORD_VALIDA = f"pw-{secrets.token_urlsafe(16)}"
PASSWORD_NUEVA = f"pw-{secrets.token_urlsafe(16)}"


@pytest.fixture
def limpieza(schema_app):
    """Retira los administradores de prueba y su auditoría, en ese orden.

    `audit_logs.administrator_id` es `RESTRICT`, así que la auditoría se va
    primero o el borrado falla.
    """

    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE administrator_id IN "
                "(SELECT id FROM administrators WHERE username LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type = 'administrator' AND entity_id IN "
                "(SELECT id FROM administrators WHERE username LIKE :p)"
            ),
            {"p": f"{PREFIJO}%"},
        )
        db.session.execute(
            text("DELETE FROM administrators WHERE username LIKE :p"), {"p": f"{PREFIJO}%"}
        )
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        yield
        limpiar()


def _crear_administrador(
    rol: str, sufijo: str, *, activo: bool = True, password: str = None
) -> int:
    """Inserta un administrador directamente, sin pasar por la API."""
    from app.core.security.password import hash_password

    administrador = Administrator(
        username=f"{PREFIJO}-{sufijo}",
        email=f"{PREFIJO}-{sufijo}@pablitosports.test",
        password_hash=hash_password(password or PASSWORD_VALIDA),
        role=rol,
        is_active=activo,
    )
    db.session.add(administrador)
    db.session.commit()
    return administrador.id


def _cliente(schema_app, administrator_id: int):
    from datetime import UTC, datetime

    client = schema_app.test_client()
    with client.session_transaction() as sesion:
        sesion["admin_id"] = administrator_id
        sesion["logged_in_at"] = datetime.now(UTC).isoformat()
        sesion["last_seen_at"] = datetime.now(UTC).isoformat()
    return client


@pytest.fixture
def super_admin(schema_app, limpieza):
    with schema_app.app_context():
        identificador = _crear_administrador("super_administrator", "super")
    return identificador


@pytest.fixture
def admin_normal(schema_app, limpieza):
    with schema_app.app_context():
        identificador = _crear_administrador("administrator", "normal")
    return identificador


@pytest.fixture
def cliente_super(schema_app, super_admin):
    return _cliente(schema_app, super_admin)


@pytest.fixture
def cliente_admin(schema_app, admin_normal):
    return _cliente(schema_app, admin_normal)


def _payload_creacion(sufijo: str = "nuevo", **overrides) -> dict:
    base = {
        "username": f"{PREFIJO}-{sufijo}",
        "email": f"{PREFIJO}-{sufijo}@pablitosports.test",
        "password": PASSWORD_VALIDA,
        "role": "administrator",
    }
    base.update(overrides)
    return base


# 1 y 2. Permisos por rol (RN-67, 07_PANEL_ADMIN.md §8.1)


def test_superadministrador_puede_operar_sobre_usuarios(cliente_super, super_admin):
    assert cliente_super.get("/api/v1/admin/users").status_code == 200
    assert cliente_super.get(f"/api/v1/admin/users/{super_admin}").status_code == 200
    assert cliente_super.post("/api/v1/admin/users", json=_payload_creacion()).status_code == 201


@pytest.mark.parametrize(
    ("metodo", "ruta"),
    [
        ("get", "/api/v1/admin/users"),
        ("post", "/api/v1/admin/users"),
        ("get", "/api/v1/admin/users/1"),
        ("put", "/api/v1/admin/users/1"),
        ("delete", "/api/v1/admin/users/1"),
    ],
)
def test_administrador_recibe_403_en_gestion_de_usuarios(cliente_admin, metodo, ruta):
    """`RN-67`: solo el Superadministrador gestiona usuarios."""
    respuesta = getattr(cliente_admin, metodo)(ruta, json={})

    assert respuesta.status_code == 403
    error = respuesta.get_json()["errors"][0]
    assert error["code"] == "insufficient_privileges"
    assert error["rule"] == "RN-67"


def test_sin_sesion_todas_las_rutas_responden_401(schema_app, limpieza):
    client = schema_app.test_client()
    for metodo, ruta in [
        ("get", "/api/v1/admin/users"),
        ("post", "/api/v1/admin/users"),
        ("get", "/api/v1/admin/users/1"),
        ("put", "/api/v1/admin/users/1"),
        ("delete", "/api/v1/admin/users/1"),
        ("post", "/api/v1/admin/users/1/change-password"),
    ]:
        assert getattr(client, metodo)(ruta, json={}).status_code == 401, ruta


# 3 y 4. Autoescalamiento de privilegios


def test_administrador_no_puede_elevar_su_propio_rol(cliente_admin, admin_normal, schema_app):
    """No hay ruta por la que un `administrator` pueda tocar roles: 403 antes de mirar el cuerpo."""
    respuesta = cliente_admin.put(
        f"/api/v1/admin/users/{admin_normal}",
        json={
            "username": f"{PREFIJO}-normal",
            "email": f"{PREFIJO}-normal@pablitosports.test",
            "role": "super_administrator",
            "is_active": True,
        },
    )

    assert respuesta.status_code == 403
    with schema_app.app_context():
        rol = db.session.execute(
            text("SELECT role FROM administrators WHERE id = :i"), {"i": admin_normal}
        ).scalar_one()
    assert rol == "administrator"


def test_administrador_no_puede_elevar_a_otro_usuario(cliente_admin, super_admin, schema_app):
    respuesta = cliente_admin.put(
        f"/api/v1/admin/users/{super_admin}",
        json={
            "username": f"{PREFIJO}-super",
            "email": f"{PREFIJO}-super@pablitosports.test",
            "role": "super_administrator",
            "is_active": True,
        },
    )

    assert respuesta.status_code == 403


def test_administrador_no_puede_crear_un_superadministrador(cliente_admin):
    respuesta = cliente_admin.post(
        "/api/v1/admin/users", json=_payload_creacion(role="super_administrator")
    )

    assert respuesta.status_code == 403


# 5 y 13. RN-71 y RN-72


def test_rn_71_al_eliminar_es_una_guarda_defensiva(schema_app, limpieza, super_admin):
    """`RN-71` sobre `DELETE` no es alcanzable por HTTP, pero la guarda existe.

    Para llegar al endpoint hay que ser superadministrador activo; si lo eres,
    el objetivo nunca es "el último activo" salvo que seas tú mismo, y ese caso
    lo corta antes `RN-72`. La regla se prueba en el servicio, que es donde vive.
    """
    from app.core.exceptions import BusinessRuleError
    from app.services.admin_user_service import AdminUserService

    with schema_app.app_context():
        # `super_admin` queda como único superadministrador activo.
        db.session.execute(
            text(
                "UPDATE administrators SET is_active = false "
                "WHERE role = 'super_administrator' AND id <> :i"
            ),
            {"i": super_admin},
        )
        db.session.commit()
        otro = _crear_administrador("administrator", "ejecutor")

        with pytest.raises(BusinessRuleError) as excepcion:
            AdminUserService.delete(super_admin, administrator_id=otro)

        assert excepcion.value.rule == "RN-71"

        db.session.execute(
            text("UPDATE administrators SET is_active = true WHERE role = 'super_administrator'")
        )
        db.session.commit()


def test_no_se_puede_desactivar_al_ultimo_superadministrador(
    cliente_super, super_admin, schema_app
):
    """`RN-71`: desactivar también deja la instalación descabezada."""
    with schema_app.app_context():
        otros = db.session.execute(
            text(
                "SELECT count(*) FROM administrators WHERE role = 'super_administrator' "
                "AND is_active AND deleted_at IS NULL AND id <> :i"
            ),
            {"i": super_admin},
        ).scalar_one()
        db.session.execute(
            text(
                "UPDATE administrators SET is_active = false "
                "WHERE role = 'super_administrator' AND id <> :i"
            ),
            {"i": super_admin},
        )
        db.session.commit()

    respuesta = cliente_super.put(
        f"/api/v1/admin/users/{super_admin}",
        json={
            "username": f"{PREFIJO}-super",
            "email": f"{PREFIJO}-super@pablitosports.test",
            "role": "super_administrator",
            "is_active": False,
        },
    )

    assert respuesta.status_code == 409
    assert respuesta.get_json()["errors"][0]["rule"] == "RN-71"

    with schema_app.app_context():
        db.session.execute(
            text("UPDATE administrators SET is_active = true WHERE role = 'super_administrator'")
        )
        db.session.commit()
        assert otros >= 0


def test_no_se_puede_degradar_al_ultimo_superadministrador(cliente_super, super_admin, schema_app):
    """`RN-71`: degradar el rol deja la instalación igual de descabezada que desactivar."""
    with schema_app.app_context():
        db.session.execute(
            text(
                "UPDATE administrators SET is_active = false "
                "WHERE role = 'super_administrator' AND id <> :i"
            ),
            {"i": super_admin},
        )
        db.session.commit()

    respuesta = cliente_super.put(
        f"/api/v1/admin/users/{super_admin}",
        json={
            "username": f"{PREFIJO}-super",
            "email": f"{PREFIJO}-super@pablitosports.test",
            "role": "administrator",
            "is_active": True,
        },
    )

    assert respuesta.status_code == 409
    assert respuesta.get_json()["errors"][0]["rule"] == "RN-71"

    with schema_app.app_context():
        db.session.execute(
            text("UPDATE administrators SET is_active = true WHERE role = 'super_administrator'")
        )
        db.session.commit()


def test_un_usuario_no_puede_eliminarse_a_si_mismo(cliente_super, super_admin):
    """`RN-72`."""
    respuesta = cliente_super.delete(f"/api/v1/admin/users/{super_admin}")

    assert respuesta.status_code == 409
    assert respuesta.get_json()["errors"][0]["rule"] == "RN-72"


# 6, 7 y 18. Creación, validación y borrado lógico


def test_creacion_valida_devuelve_201_y_el_dto_del_contrato(cliente_super):
    """§10.10: campos exactos de `AdministratorDTO`."""
    respuesta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion())

    assert respuesta.status_code == 201
    datos = respuesta.get_json()["data"]
    assert set(datos) == {
        "id",
        "username",
        "email",
        "role",
        "last_login_at",
        "is_active",
        "created_at",
        "updated_at",
        "deleted_at",
    }
    assert datos["role"] == "administrator"
    assert datos["is_active"] is True
    assert datos["last_login_at"] is None


@pytest.mark.parametrize(
    ("payload", "campo"),
    [
        ({"username": ""}, "username"),
        ({"email": "no-es-un-correo"}, "email"),
        ({"password": "corta"}, "password"),
        ({"role": "dueno"}, "role"),
    ],
)
def test_creacion_invalida_devuelve_422_con_el_campo(cliente_super, payload, campo):
    respuesta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion(**payload))

    assert respuesta.status_code == 422
    assert campo in {error["field"] for error in respuesta.get_json()["errors"]}


def test_username_duplicado_es_422(cliente_super):
    cliente_super.post("/api/v1/admin/users", json=_payload_creacion())

    respuesta = cliente_super.post(
        "/api/v1/admin/users",
        json=_payload_creacion(email=f"{PREFIJO}-otro@pablitosports.test"),
    )

    assert respuesta.status_code == 422
    assert "username" in {error["field"] for error in respuesta.get_json()["errors"]}


def test_username_de_usuario_eliminado_no_se_reutiliza(cliente_super, schema_app):
    """04 §9.2.13: la unicidad incluye filas eliminadas."""
    creado = cliente_super.post("/api/v1/admin/users", json=_payload_creacion()).get_json()["data"]
    assert cliente_super.delete(f"/api/v1/admin/users/{creado['id']}").status_code == 204

    respuesta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion())

    assert respuesta.status_code == 422


def test_eliminar_usuario_es_borrado_logico(cliente_super, schema_app, outside):
    """`AD-18`: la fila permanece, marcada."""
    creado = cliente_super.post("/api/v1/admin/users", json=_payload_creacion()).get_json()["data"]

    respuesta = cliente_super.delete(f"/api/v1/admin/users/{creado['id']}")

    assert respuesta.status_code == 204
    assert respuesta.get_data() == b""
    with outside.connect() as conexion:
        fila = conexion.execute(
            text("SELECT is_active, deleted_at FROM administrators WHERE id = :i"),
            {"i": creado["id"]},
        ).one()
    assert fila.is_active is False
    assert fila.deleted_at is not None

    assert cliente_super.get(f"/api/v1/admin/users/{creado['id']}").status_code == 404


# 8 y 9. Contraseña almacenada y nunca expuesta


def test_la_contrasena_se_almacena_solo_como_hash_bcrypt(cliente_super, schema_app, outside):
    """§5.5: bcrypt con coste ≥ 12; nunca texto plano."""
    creado = cliente_super.post("/api/v1/admin/users", json=_payload_creacion()).get_json()["data"]

    with outside.connect() as conexion:
        almacenado = conexion.execute(
            text("SELECT password_hash FROM administrators WHERE id = :i"), {"i": creado["id"]}
        ).scalar_one()

    assert almacenado != PASSWORD_VALIDA
    assert almacenado.startswith("$2b$12$")
    assert verify_password(PASSWORD_VALIDA, almacenado)


def test_password_hash_nunca_aparece_en_las_respuestas(cliente_super, super_admin):
    creado = cliente_super.post("/api/v1/admin/users", json=_payload_creacion())
    listado = cliente_super.get("/api/v1/admin/users")
    detalle = cliente_super.get(f"/api/v1/admin/users/{super_admin}")

    for respuesta in (creado, listado, detalle):
        cuerpo = respuesta.get_data(as_text=True).lower()
        assert "password" not in cuerpo
        assert "$2b$" not in cuerpo


# 10, 11 y 12. Cambio de contraseña e invalidación de sesiones


def test_cambio_de_contrasena_propia_exitoso(schema_app, admin_normal, outside):
    cliente = _cliente(schema_app, admin_normal)

    respuesta = cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": PASSWORD_NUEVA},
    )

    assert respuesta.status_code == 204
    with outside.connect() as conexion:
        almacenado = conexion.execute(
            text("SELECT password_hash FROM administrators WHERE id = :i"), {"i": admin_normal}
        ).scalar_one()
    assert verify_password(PASSWORD_NUEVA, almacenado)
    assert not verify_password(PASSWORD_VALIDA, almacenado)


def test_cambio_de_contrasena_con_actual_incorrecta_es_401(schema_app, admin_normal, outside):
    cliente = _cliente(schema_app, admin_normal)

    respuesta = cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": "no-es-la-actual", "new_password": PASSWORD_NUEVA},
    )

    assert respuesta.status_code == 401
    with outside.connect() as conexion:
        almacenado = conexion.execute(
            text("SELECT password_hash FROM administrators WHERE id = :i"), {"i": admin_normal}
        ).scalar_one()
    assert verify_password(PASSWORD_VALIDA, almacenado)


def test_cambio_de_contrasena_propia_sin_current_password_es_422(schema_app, admin_normal):
    cliente = _cliente(schema_app, admin_normal)

    respuesta = cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"new_password": PASSWORD_NUEVA},
    )

    assert respuesta.status_code == 422
    assert respuesta.get_json()["errors"][0]["field"] == "current_password"


def test_nueva_contrasena_debe_cumplir_la_politica(schema_app, admin_normal):
    """§5.5: mínimo 12 caracteres, tope de 72 bytes y sin triviales."""
    cliente = _cliente(schema_app, admin_normal)

    respuesta = cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": "corta"},
    )

    assert respuesta.status_code == 422
    assert respuesta.get_json()["errors"][0]["field"] == "new_password"


def test_administrador_no_puede_cambiar_la_contrasena_de_otro(
    schema_app, admin_normal, super_admin
):
    """§9.14: cambiar la de otro requiere superadministrador."""
    cliente = _cliente(schema_app, admin_normal)

    respuesta = cliente.post(
        f"/api/v1/admin/users/{super_admin}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": PASSWORD_NUEVA},
    )

    assert respuesta.status_code == 403
    assert respuesta.get_json()["errors"][0]["rule"] == "RN-67"


def test_superadministrador_cambia_la_de_otro_sin_current_password(
    cliente_super, admin_normal, outside
):
    """§9.14: `current_password` se ignora cuando lo hace un superadministrador."""
    respuesta = cliente_super.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"new_password": PASSWORD_NUEVA},
    )

    assert respuesta.status_code == 204
    with outside.connect() as conexion:
        almacenado = conexion.execute(
            text("SELECT password_hash FROM administrators WHERE id = :i"), {"i": admin_normal}
        ).scalar_one()
    assert verify_password(PASSWORD_NUEVA, almacenado)


def test_el_cambio_de_contrasena_invalida_la_sesion(schema_app, admin_normal):
    """§7.3: cambiar la contraseña invalida la sesión del usuario."""
    cliente = _cliente(schema_app, admin_normal)
    # La sesión está viva antes del cambio.
    assert cliente.get("/api/v1/admin/auth/me").status_code == 200

    cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": PASSWORD_NUEVA},
    )

    assert cliente.get("/api/v1/admin/auth/me").status_code == 401


def test_la_desactivacion_invalida_la_sesion(schema_app, cliente_super, admin_normal):
    """§7.3: desactivar al usuario invalida su sesión."""
    victima = _cliente(schema_app, admin_normal)
    assert victima.get("/api/v1/admin/auth/me").status_code == 200

    cliente_super.put(
        f"/api/v1/admin/users/{admin_normal}",
        json={
            "username": f"{PREFIJO}-normal",
            "email": f"{PREFIJO}-normal@pablitosports.test",
            "role": "administrator",
            "is_active": False,
        },
    )

    assert victima.get("/api/v1/admin/auth/me").status_code == 401


def test_la_eliminacion_invalida_la_sesion(schema_app, cliente_super, admin_normal):
    """§7.3: eliminar al usuario invalida su sesión."""
    victima = _cliente(schema_app, admin_normal)
    assert victima.get("/api/v1/admin/auth/me").status_code == 200

    assert cliente_super.delete(f"/api/v1/admin/users/{admin_normal}").status_code == 204

    assert victima.get("/api/v1/admin/auth/me").status_code == 401


# 16. Auditoría


def test_cada_operacion_deja_auditoria_atribuida(cliente_super, super_admin, outside):
    creado = cliente_super.post("/api/v1/admin/users", json=_payload_creacion()).get_json()["data"]
    cliente_super.put(
        f"/api/v1/admin/users/{creado['id']}",
        json={
            "username": creado["username"],
            "email": creado["email"],
            "role": "administrator",
            "is_active": False,
        },
    )
    cliente_super.delete(f"/api/v1/admin/users/{creado['id']}")

    with outside.connect() as conexion:
        filas = list(
            conexion.execute(
                text(
                    "SELECT action, administrator_id, old_values, new_values FROM audit_logs "
                    "WHERE entity_type = 'administrator' AND entity_id = :i ORDER BY id"
                ),
                {"i": creado["id"]},
            ).mappings()
        )

    assert [fila["action"] for fila in filas] == ["create", "deactivate", "delete"]
    assert {fila["administrator_id"] for fila in filas} == {super_admin}
    assert filas[0]["new_values"]["username"] == creado["username"]


def test_la_auditoria_nunca_registra_la_contrasena(schema_app, admin_normal, outside):
    cliente = _cliente(schema_app, admin_normal)
    cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": PASSWORD_NUEVA},
    )

    with outside.connect() as conexion:
        filas = list(
            conexion.execute(
                text(
                    "SELECT old_values, new_values FROM audit_logs "
                    "WHERE entity_type = 'administrator' AND entity_id = :i"
                ),
                {"i": admin_normal},
            ).mappings()
        )

    assert filas
    serializado = str(filas).lower()
    assert PASSWORD_VALIDA not in serializado
    assert PASSWORD_NUEVA not in serializado
    assert "password" not in serializado


# 17. Rollback


def test_excepcion_tras_escribir_revierte_usuario_y_auditoria(
    cliente_super, super_admin, outside, monkeypatch
):
    """`CONS-05`: la operación y su auditoría caen juntas."""
    from app.services.admin_user_service import AdminUserService

    def explota(cls, administrator_id):
        raise RuntimeError("fallo simulado despues de escribir")

    monkeypatch.setattr(AdminUserService, "_require", classmethod(explota))

    respuesta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion())
    # `create` no llama a `_require`; se fuerza el fallo en `update`.
    assert respuesta.status_code == 201
    creado = respuesta.get_json()["data"]

    fallida = cliente_super.put(
        f"/api/v1/admin/users/{creado['id']}",
        json={
            "username": creado["username"],
            "email": creado["email"],
            "role": "administrator",
            "is_active": False,
        },
    )

    assert fallida.status_code == 500
    with outside.connect() as conexion:
        activo = conexion.execute(
            text("SELECT is_active FROM administrators WHERE id = :i"), {"i": creado["id"]}
        ).scalar_one()
        acciones = [
            fila[0]
            for fila in conexion.execute(
                text(
                    "SELECT action FROM audit_logs WHERE entity_type = 'administrator' "
                    "AND entity_id = :i ORDER BY id"
                ),
                {"i": creado["id"]},
            )
        ]
    assert activo is True  # la desactivación se revirtió
    assert acciones == ["create"]  # no quedó auditoría de la operación fallida


def test_fallo_de_auditoria_revierte_la_creacion(cliente_super, outside, monkeypatch):
    """`CONS-05`: una auditoría que puede faltar no es auditoría."""
    from app.core.audit import AuditService

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    respuesta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion())

    assert respuesta.status_code == 500
    with outside.connect() as conexion:
        existentes = conexion.execute(
            text("SELECT count(*) FROM administrators WHERE username = :u"),
            {"u": f"{PREFIJO}-nuevo"},
        ).scalar_one()
    assert existentes == 0


# 19 y 20. Paginación y contrato HTTP


def test_el_listado_pagina(cliente_super):
    for indice in range(3):
        cliente_super.post("/api/v1/admin/users", json=_payload_creacion(sufijo=f"pag{indice}"))

    respuesta = cliente_super.get("/api/v1/admin/users?per_page=2")

    cuerpo = respuesta.get_json()
    assert len(cuerpo["data"]) == 2
    assert cuerpo["meta"]["per_page"] == 2
    assert cuerpo["meta"]["total"] >= 4
    assert cuerpo["meta"]["total_pages"] >= 2


def test_el_listado_acota_per_page_en_silencio(cliente_super):
    """§4.4: un `per_page` por encima del máximo se acota, no da error."""
    respuesta = cliente_super.get("/api/v1/admin/users?per_page=5000")

    assert respuesta.status_code == 200
    assert respuesta.get_json()["meta"]["per_page"] == 100


def test_el_listado_rechaza_una_pagina_mal_formada(cliente_super):
    """§11: un parámetro conocido pero mal formado es 422, no un silencio."""
    respuesta = cliente_super.get("/api/v1/admin/users?page=primera")

    assert respuesta.status_code == 422
    assert respuesta.get_json()["errors"][0]["field"] == "page"


def test_el_listado_excluye_a_los_eliminados(cliente_super):
    creado = cliente_super.post("/api/v1/admin/users", json=_payload_creacion()).get_json()["data"]
    cliente_super.delete(f"/api/v1/admin/users/{creado['id']}")

    listado = cliente_super.get("/api/v1/admin/users").get_json()["data"]

    assert creado["id"] not in {item["id"] for item in listado}


def test_usuario_inexistente_es_404(cliente_super):
    assert cliente_super.get("/api/v1/admin/users/99999999").status_code == 404
    assert cliente_super.delete("/api/v1/admin/users/99999999").status_code == 404


def test_la_envoltura_ad16_se_respeta(cliente_super):
    cuerpo = cliente_super.get("/api/v1/admin/users").get_json()

    assert cuerpo["success"] is True
    assert cuerpo["errors"] == []
    assert "request_id" in cuerpo["meta"]


# ---------------------------------------------------------------------------
# Política de contraseñas en los dos caminos que la fijan (03_SEGURIDAD.md §5.5)
#
# La validación vive en un único sitio (`_contrasena` de
# `administrator_schemas`), pero eso es un detalle interno: lo que estos tests
# fijan es que el ALTA y el CAMBIO la apliquen igual desde fuera. Si algún día
# se duplicara la validación y una de las dos se quedara atrás, esto lo caza.
# ---------------------------------------------------------------------------

CONTRASENAS_RECHAZADAS = [
    ("once-caract", "por debajo del mínimo de 12"),
    ("pablitosports", "trivial: el nombre del propio negocio"),
    ("123456789012", "trivial: secuencia"),
    ("aaaaaaaaaaaa", "trivial: un solo carácter repetido"),
    ("a" * 73, "por encima del tope de 72 bytes de bcrypt"),
]


@pytest.mark.parametrize(("password", "motivo"), CONTRASENAS_RECHAZADAS)
def test_el_alta_rechaza_las_contrasenas_debiles(cliente_super, password, motivo):
    respuesta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion(password=password))

    assert respuesta.status_code == 422, motivo
    assert respuesta.get_json()["errors"][0]["field"] == "password"


@pytest.mark.parametrize(("password", "motivo"), CONTRASENAS_RECHAZADAS)
def test_el_cambio_rechaza_las_mismas_contrasenas_que_el_alta(
    schema_app, admin_normal, password, motivo
):
    cliente = _cliente(schema_app, admin_normal)

    respuesta = cliente.post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": password},
    )

    assert respuesta.status_code == 422, motivo
    assert respuesta.get_json()["errors"][0]["field"] == "new_password"


def test_el_error_nombra_el_campo_correcto_en_cada_camino(schema_app, admin_normal, cliente_super):
    """El motivo se adapta: `password` al crear, `new_password` al cambiar."""
    alta = cliente_super.post("/api/v1/admin/users", json=_payload_creacion(password="corta"))
    cambio = _cliente(schema_app, admin_normal).post(
        f"/api/v1/admin/users/{admin_normal}/change-password",
        json={"current_password": PASSWORD_VALIDA, "new_password": "corta"},
    )

    assert alta.get_json()["errors"][0]["detail"].startswith("password must be at least 12")
    assert cambio.get_json()["errors"][0]["detail"].startswith("new_password must be at least 12")


def test_una_contrasena_valida_se_acepta_y_permite_iniciar_sesion(schema_app, cliente_super):
    """Regresión completa: crear con la política nueva y entrar con esa contraseña."""
    nueva = f"valida-{secrets.token_urlsafe(12)}"
    creado = cliente_super.post(
        "/api/v1/admin/users",
        json=_payload_creacion(username=f"{PREFIJO}-login", password=nueva),
    )
    assert creado.status_code == 201

    respuesta = schema_app.test_client().post(
        "/api/v1/admin/auth/login",
        json={"username": f"{PREFIJO}-login", "password": nueva},
    )

    assert respuesta.status_code == 200
    assert respuesta.get_json()["data"]["administrator"]["username"] == f"{PREFIJO}-login"
