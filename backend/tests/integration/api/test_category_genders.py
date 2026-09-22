"""Sexos por categoría (RN-83, AD-41, v2.10.0).

El campo existe para que el administrador ordene el menú de la tienda desde el
panel. Acá se comprueba el contrato: qué acepta el panel, qué devuelve, y qué
publica el árbol del catálogo.
"""

import pytest
from sqlalchemy import text

from app.extensions import db

SLUG_PREFIX = "cat-sexos-"


@pytest.fixture
def categoria_sexos_cleanup(schema_app):
    def limpiar():
        # `category_genders` tiene `ondelete RESTRICT`: hay que soltar la
        # relación antes de borrar la categoría, o la limpieza falla.
        db.session.execute(
            text(
                "DELETE FROM category_genders WHERE category_id IN "
                f"(SELECT id FROM categories WHERE slug LIKE '{SLUG_PREFIX}%')"
            )
        )
        db.session.execute(
            text(
                "DELETE FROM audit_logs WHERE entity_type = 'category' AND entity_id IN "
                f"(SELECT id FROM categories WHERE slug LIKE '{SLUG_PREFIX}%')"
            )
        )
        db.session.execute(text(f"DELETE FROM categories WHERE slug LIKE '{SLUG_PREFIX}%'"))
        db.session.commit()

    with schema_app.app_context():
        limpiar()
        yield
        limpiar()


def _gender_ids(outside, *slugs) -> list[int]:
    with outside.connect() as connection:
        return [
            connection.execute(
                text("SELECT id FROM genders WHERE slug = :slug"), {"slug": slug}
            ).scalar_one()
            for slug in slugs
        ]


def _crear(admin_client, slug: str, gender_ids=None):
    payload = {"name": f"Categoria {slug}", "slug": slug}
    if gender_ids is not None:
        payload["gender_ids"] = gender_ids
    response = admin_client.post("/api/v1/admin/categories", json=payload)
    assert response.status_code == 201, response.get_json()
    return response.get_json()["data"]


def test_el_alta_guarda_y_devuelve_los_sexos(admin_client, categoria_sexos_cleanup, outside):
    ids = _gender_ids(outside, "women", "girls")

    data = _crear(admin_client, f"{SLUG_PREFIX}vestidos", ids)

    assert sorted(data["gender_ids"]) == sorted(ids)


def test_el_alta_sin_sexos_deja_la_categoria_sin_restriccion(
    admin_client, categoria_sexos_cleanup
):
    """AD-41: omitir `gender_ids` es válido y significa «aparece en todos»."""
    data = _crear(admin_client, f"{SLUG_PREFIX}sin-sexos")

    assert data["gender_ids"] == []


def test_el_put_reemplaza_la_lista_completa(admin_client, categoria_sexos_cleanup, outside):
    """§10.13: `PUT` reemplaza el recurso, no hace un merge."""
    women, girls, men = _gender_ids(outside, "women", "girls", "men")
    data = _crear(admin_client, f"{SLUG_PREFIX}reemplazo", [women, girls])

    response = admin_client.put(
        f"/api/v1/admin/categories/{data['id']}",
        json={"name": data["name"], "slug": data["slug"], "gender_ids": [men]},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["gender_ids"] == [men]


def test_la_lista_vacia_borra_los_sexos(admin_client, categoria_sexos_cleanup, outside):
    (women,) = _gender_ids(outside, "women")
    data = _crear(admin_client, f"{SLUG_PREFIX}vaciar", [women])

    response = admin_client.put(
        f"/api/v1/admin/categories/{data['id']}",
        json={"name": data["name"], "slug": data["slug"], "gender_ids": []},
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["gender_ids"] == []


def test_un_sexo_inexistente_responde_422(admin_client, categoria_sexos_cleanup):
    """Un id que no existe es error del cliente, no una fila `None` en la N:M."""
    response = admin_client.post(
        "/api/v1/admin/categories",
        json={"name": "Categoria rota", "slug": f"{SLUG_PREFIX}rota", "gender_ids": [999999]},
    )

    assert response.status_code == 422


def test_los_sexos_repetidos_no_duplican_la_relacion(
    admin_client, categoria_sexos_cleanup, outside
):
    (women,) = _gender_ids(outside, "women")

    data = _crear(admin_client, f"{SLUG_PREFIX}repetido", [women, women])

    assert data["gender_ids"] == [women]


def test_el_cambio_de_sexos_queda_auditado(admin_client, categoria_sexos_cleanup, outside):
    """AD-20: el snapshot sale del DTO, así que incluye `gender_ids`."""
    women, men = _gender_ids(outside, "women", "men")
    data = _crear(admin_client, f"{SLUG_PREFIX}auditada", [women])

    admin_client.put(
        f"/api/v1/admin/categories/{data['id']}",
        json={"name": data["name"], "slug": data["slug"], "gender_ids": [men]},
    )

    with outside.connect() as connection:
        old_values, new_values = connection.execute(
            text(
                "SELECT old_values, new_values FROM audit_logs WHERE entity_type = 'category' "
                "AND entity_id = :id AND action = 'update' ORDER BY id DESC LIMIT 1"
            ),
            {"id": data["id"]},
        ).one()

    assert old_values["gender_ids"] == [women]
    assert new_values["gender_ids"] == [men]


def test_el_arbol_publico_expone_los_sexos_por_slug(
    admin_client, categoria_sexos_cleanup, outside
):
    """AD-12: la API pública identifica por slug, nunca por id.

    Se usa `admin_client` para leer el endpoint público —que no pide sesión—
    porque `catalog_client` vacía las tablas de negocio al montarse y se
    llevaría por delante la categoría que este test acaba de crear.
    """
    women, girls = _gender_ids(outside, "women", "girls")
    _crear(admin_client, f"{SLUG_PREFIX}publica", [women, girls])

    response = admin_client.get("/api/v1/categories")

    assert response.status_code == 200
    categoria = next(
        item
        for item in response.get_json()["data"]
        if item["slug"] == f"{SLUG_PREFIX}publica"
    )
    assert categoria["genders"] == ["girls", "women"]


def test_el_arbol_publico_expone_los_sexos_de_las_hijas(
    admin_client, categoria_sexos_cleanup, outside
):
    """Una hija puede restringirse sola, sin que la madre lo esté."""
    (boys,) = _gender_ids(outside, "boys")
    madre = _crear(admin_client, f"{SLUG_PREFIX}madre")

    response = admin_client.post(
        "/api/v1/admin/categories",
        json={
            "name": "Conjuntos de nino",
            "slug": f"{SLUG_PREFIX}hija",
            "parent_id": madre["id"],
            "gender_ids": [boys],
        },
    )
    assert response.status_code == 201

    arbol = admin_client.get("/api/v1/categories").get_json()["data"]
    raiz = next(item for item in arbol if item["slug"] == f"{SLUG_PREFIX}madre")

    assert raiz["genders"] == []
    assert raiz["children"][0]["genders"] == ["boys"]
