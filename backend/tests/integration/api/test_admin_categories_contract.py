"""Contrato de las clasificaciones del panel (05_API.md §9.5 a §9.9)."""

import pytest
from sqlalchemy import text

from app.extensions import db


@pytest.fixture
def categoria_cleanup(schema_app):
    def limpiar():
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type = 'category' AND entity_id IN "
                "(SELECT id FROM categories WHERE slug LIKE 'cat-contrato-%')"
            )
        )
        db.session.execute(text("DELETE FROM categories WHERE slug LIKE 'cat-contrato-%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        yield
        limpiar()


def _crear(admin_client, slug: str = "cat-contrato-a"):
    response = admin_client.post(
        "/api/v1/admin/categories", json={"name": "Categoria contrato", "slug": slug}
    )
    assert response.status_code == 201
    return response.get_json()["data"]["id"]


def test_borrado_logico_de_categoria_responde_204_sin_cuerpo(
    admin_client, categoria_cleanup, outside
):
    """§9.5: `DELETE /categories/{id}` responde 204."""
    category_id = _crear(admin_client)

    response = admin_client.delete(f"/api/v1/admin/categories/{category_id}")

    assert response.status_code == 204
    assert response.get_data() == b""

    # AD-18: la fila permanece, solo queda marcada.
    with outside.connect() as connection:
        deleted_at = connection.execute(
            text("SELECT deleted_at FROM categories WHERE id = :id"), {"id": category_id}
        ).scalar_one()
    assert deleted_at is not None


def test_el_204_no_impide_auditar_el_borrado(
    admin_client, categoria_cleanup, administrator_id, outside
):
    """Que la respuesta no lleve cuerpo no cambia nada para `AD-20`."""
    category_id = _crear(admin_client)
    admin_client.delete(f"/api/v1/admin/categories/{category_id}")

    with outside.connect() as connection:
        acciones = [
            row[0]
            for row in connection.execute(
                text(
                    "SELECT action FROM audit_logs WHERE entity_type = 'category' "
                    "AND entity_id = :id ORDER BY id"
                ),
                {"id": category_id},
            )
        ]

    assert acciones == ["create", "delete"]


def test_categoria_con_subcategorias_da_409_con_envoltura(admin_client, categoria_cleanup):
    """§9.5: el 409 sí lleva cuerpo; un error tiene contenido que comunicar."""
    padre_id = _crear(admin_client, slug="cat-contrato-padre")
    hija = admin_client.post(
        "/api/v1/admin/categories",
        json={"name": "Hija", "slug": "cat-contrato-hija", "parent_id": padre_id},
    )
    assert hija.status_code == 201

    response = admin_client.delete(f"/api/v1/admin/categories/{padre_id}")

    assert response.status_code == 409
    error = response.get_json()["errors"][0]
    assert error["rule"] == "RN-68"


def test_restaurar_categoria_sigue_devolviendo_el_recurso(admin_client, categoria_cleanup):
    """`restore` no está tipificado como 204: devuelve la entidad restaurada."""
    category_id = _crear(admin_client)
    admin_client.delete(f"/api/v1/admin/categories/{category_id}")

    response = admin_client.post(f"/api/v1/admin/categories/{category_id}/restore")

    assert response.status_code == 200
    assert response.get_json()["data"]["deleted_at"] is None
