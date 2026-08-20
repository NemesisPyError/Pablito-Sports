"""Auditoría de las escrituras del panel (AD-20, CONS-05, 11_TESTING.md §12.6).

Cada test recorre la ruta real: guarda de sesión, servicio, repositorio,
`audit_logs` y cierre de la transacción. Las comprobaciones de persistencia se
hacen desde una conexión ajena a la sesión de la aplicación, porque lo que se
está verificando es precisamente si la transacción se cerró.
"""

import pytest
from sqlalchemy import text

from app.core.audit import AuditService
from app.extensions import db
from app.services.admin_classification_service import AdminBrandService

SLUG = "audit-marca-de-prueba"


def _brands(engine, slug: str = SLUG) -> int:
    with engine.connect() as connection:
        return connection.execute(
            text("SELECT count(*) FROM brands WHERE slug = :slug"), {"slug": slug}
        ).scalar_one()


def _audit_rows(engine, administrator_id: int) -> list:
    with engine.connect() as connection:
        return list(
            connection.execute(
                text(
                    "SELECT action, entity_type, entity_id, old_values, new_values, created_at "
                    "FROM audit_logs WHERE administrator_id = :administrator_id "
                    "ORDER BY id"
                ),
                {"administrator_id": administrator_id},
            ).mappings()
        )


@pytest.fixture
def brands_cleanup(schema_app):
    with schema_app.app_context():
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'audit-%'"))
        db.session.commit()
        yield
        db.session.execute(text("DELETE FROM brands WHERE slug LIKE 'audit-%'"))
        db.session.commit()


# A. Operación correcta: modificación + auditoría + commit + persistencia.


def test_crear_marca_persiste_la_entidad_y_su_auditoria(
    admin_client, administrator_id, brands_cleanup, outside
):
    response = admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})

    assert response.status_code == 201
    assert _brands(outside) == 1

    rows = _audit_rows(outside, administrator_id)
    assert len(rows) == 1
    assert rows[0]["action"] == "create"
    assert rows[0]["entity_type"] == "brand"
    assert rows[0]["entity_id"] == response.get_json()["data"]["id"]
    assert rows[0]["old_values"] is None
    assert rows[0]["new_values"]["slug"] == SLUG


def test_editar_marca_registra_valores_anterior_y_nuevo(
    admin_client, administrator_id, brands_cleanup, outside
):
    created = admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})
    brand_id = created.get_json()["data"]["id"]

    response = admin_client.put(
        f"/api/v1/admin/brands/{brand_id}", json={"name": "Audit editada", "slug": SLUG}
    )

    assert response.status_code == 200
    rows = _audit_rows(outside, administrator_id)
    assert [row["action"] for row in rows] == ["create", "update"]
    assert rows[1]["old_values"]["name"] == "Audit"
    assert rows[1]["new_values"]["name"] == "Audit editada"


def test_eliminar_y_restaurar_registran_delete_y_activate(
    admin_client, administrator_id, brands_cleanup, outside
):
    """`restore` no tiene acción propia: el CHECK `action_allowed` cierra el conjunto."""
    created = admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})
    brand_id = created.get_json()["data"]["id"]

    assert admin_client.delete(f"/api/v1/admin/brands/{brand_id}").status_code == 200
    assert admin_client.post(f"/api/v1/admin/brands/{brand_id}/restore").status_code == 200

    rows = _audit_rows(outside, administrator_id)
    assert [row["action"] for row in rows] == ["create", "delete", "activate"]
    assert rows[1]["old_values"]["deleted_at"] is None
    assert rows[1]["new_values"]["deleted_at"] is not None
    assert rows[2]["new_values"]["deleted_at"] is None


# B. Excepción tras la modificación: rollback completo, sin auditoría.


def test_excepcion_tras_escribir_no_deja_marca_ni_auditoria(
    admin_client, administrator_id, brands_cleanup, outside, monkeypatch
):
    """El caso que antes persistía: `flush()` sin frontera transaccional.

    `Flask-Session` comparte la sesión de la aplicación y hace `commit()` al
    guardar la sesión de usuario, ya en la fase de respuesta. Sin `@transactional`
    esa confirmación implícita alcanzaba también a la escritura a medias.
    """

    def explota(cls, entity):
        raise RuntimeError("fallo simulado despues de escribir")

    monkeypatch.setattr(AdminBrandService, "_to_admin_dto", classmethod(explota))

    response = admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})

    assert response.status_code == 500
    assert _brands(outside) == 0
    assert _audit_rows(outside, administrator_id) == []


def test_regla_de_negocio_incumplida_no_deja_rastro(
    admin_client, administrator_id, brands_cleanup, outside
):
    """AD-19/RN-79: el slug repetido corta la operación; nada se registra dos veces."""
    admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})

    response = admin_client.post("/api/v1/admin/brands", json={"name": "Otra", "slug": SLUG})

    assert response.status_code == 409
    assert _brands(outside) == 1
    assert len(_audit_rows(outside, administrator_id)) == 1


# D. Fallo de la auditoría: la operación completa se revierte.


def test_fallo_de_auditoria_revierte_la_operacion(
    admin_client, administrator_id, brands_cleanup, outside, monkeypatch
):
    """CONS-05: una auditoría que puede faltar no es auditoría."""

    def explota(**kwargs):
        raise RuntimeError("audit_logs no disponible")

    monkeypatch.setattr(AuditService, "record", staticmethod(explota))

    response = admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})

    assert response.status_code == 500
    assert _brands(outside) == 0
    assert _audit_rows(outside, administrator_id) == []


# C. La auditoría viaja en la misma transacción que la operación.


def test_auditoria_y_operacion_se_confirman_juntas(
    admin_client, administrator_id, brands_cleanup, outside
):
    """Antes del commit no debe verse ni la marca ni su registro desde fuera."""
    with pytest.MonkeyPatch.context() as patch:
        observado = {}

        original = AdminBrandService.repo.create.__func__

        def create_y_observar(cls, **fields):
            entity = original(cls, **fields)
            observado["marcas_visibles_antes_del_commit"] = _brands(outside)
            return entity

        patch.setattr(
            AdminBrandService.repo, "create", classmethod(create_y_observar), raising=False
        )

        response = admin_client.post("/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG})

    assert response.status_code == 201
    # La escritura no era visible mientras la transacción seguía abierta...
    assert observado["marcas_visibles_antes_del_commit"] == 0
    # ...y al cerrarse aparecieron marca y auditoría a la vez.
    assert _brands(outside) == 1
    assert len(_audit_rows(outside, administrator_id)) == 1


def test_escritura_sin_sesion_no_llega_al_servicio(schema_app, brands_cleanup, outside):
    """PA-06: sin sesión no hay escritura ni, por tanto, auditoría."""
    response = schema_app.test_client().post(
        "/api/v1/admin/brands", json={"name": "Audit", "slug": SLUG}
    )

    assert response.status_code == 401
    assert _brands(outside) == 0
