"""Reset del entorno de desarrollo (`scripts/seed_dev_data.py`).

El reset no es código de producción, pero sí parte del entorno: si falla a
medias deja la base en un estado que nadie declaró. Todas las FK del esquema son
`ON DELETE RESTRICT` (04_BASE_DATOS.md §9), de modo que el **orden** de borrado
es parte del contrato, no un detalle.

El fallo que motivó estos tests: `price_history` no estaba en la lista, y
`RN-70` la ata a `products` con `RESTRICT`. En cuanto existía un cambio de
precio, el reset moría a mitad de camino con un error de integridad.
"""

import importlib.util
import sys
from pathlib import Path

import pytest
from sqlalchemy import text

from app.extensions import db

# El script vive fuera de `backend/`, montado en el contenedor (99 §7.2).
SEED_SCRIPT = Path("/scripts/seed_dev_data.py")


def _load_seed_module():
    """Carga el script por ruta. Su `main()` solo corre bajo `__main__`."""
    spec = importlib.util.spec_from_file_location("seed_dev_data", SEED_SCRIPT)
    module = importlib.util.module_from_spec(spec)
    sys.modules["seed_dev_data"] = module
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def seed_module():
    if not SEED_SCRIPT.exists():
        pytest.skip("scripts/ no está montado en este contenedor")
    return _load_seed_module()


@pytest.fixture
def base_aislada(schema_app):
    """Aísla al reset de la base que comparte el resto de la suite.

    `_reset()` vacía tablas y hace `commit()`. Ejecutado tal cual arrasaría el
    catálogo de `catalog_client`, que es de alcance de sesión, y el resultado
    dependería del orden de ejecución: justo el test inestable que 11_TESTING.md
    §9.1 prohíbe.

    Se ata `db.session` a una conexión con transacción propia y se le pide que
    cada `commit()` cierre un savepoint en lugar de la transacción real. El
    reset se ejecuta de verdad —sus errores de integridad afloran igual— pero al
    terminar no queda rastro.
    """
    connection = db.engine.connect()
    transaction = connection.begin()

    db.session.remove()
    db.session.configure(bind=connection, join_transaction_mode="create_savepoint")
    try:
        with schema_app.app_context():
            yield
    finally:
        db.session.remove()
        db.session.configure(bind=db.engine, join_transaction_mode="conditional_savepoint")
        if transaction.is_active:
            transaction.rollback()
        connection.close()


def _fk_dependencies() -> dict[str, set[str]]:
    """`{tabla: tablas a las que apunta}`, leído del esquema vivo."""
    filas = db.session.execute(
        text(
            "SELECT tc.table_name, ccu.table_name AS referenced "
            "FROM information_schema.table_constraints tc "
            "JOIN information_schema.constraint_column_usage ccu "
            "  ON ccu.constraint_name = tc.constraint_name "
            "WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'"
        )
    )
    dependencias: dict[str, set[str]] = {}
    for hija, padre in filas:
        dependencias.setdefault(hija, set()).add(padre)
    return dependencias


@pytest.fixture
def catalogo_con_historial(base_aislada, administrator_id):
    """seed → producto → cambio de `list_price` → `price_history`.

    Reproduce el escenario exacto que rompía el reset. Todo lo que crea vive
    dentro de la transacción de `base_aislada` y desaparece al terminar.
    """
    from app.services.admin_product_service import AdminProductService

    db.session.execute(
        text("INSERT INTO brands (name, slug, is_active) VALUES ('Reset', 'reset-marca', true)")
    )
    db.session.execute(
        text(
            "INSERT INTO categories (name, slug, is_active) "
            "VALUES ('Reset padre', 'reset-padre', true)"
        )
    )
    db.session.commit()

    referencias = (
        db.session.execute(
            text(
                "SELECT (SELECT id FROM brands WHERE slug = 'reset-marca') AS brand_id, "
                "(SELECT id FROM categories WHERE slug = 'reset-padre') AS category_id, "
                "(SELECT id FROM genders LIMIT 1) AS gender_id, "
                "(SELECT id FROM size_types LIMIT 1) AS size_type_id"
            )
        )
        .mappings()
        .one()
    )

    # Subcategoría: `categories` tiene auto-FK con RESTRICT, así que el vaciado
    # de la tabla debe resolver también la jerarquía.
    db.session.execute(
        text(
            "INSERT INTO categories (name, slug, is_active, parent_id) "
            "VALUES ('Reset hija', 'reset-hija', true, :parent)"
        ),
        {"parent": referencias["category_id"]},
    )
    db.session.commit()

    payload = {
        "name": "Producto reset",
        "sku": "RESET-001",
        "list_price": 100000,
        "primary_category_id": referencias["category_id"],
        "brand_id": referencias["brand_id"],
        "gender_id": referencias["gender_id"],
        "size_type_id": referencias["size_type_id"],
    }
    creado = AdminProductService.create(payload, administrator_id=administrator_id)
    AdminProductService.update(
        creado["id"], {**payload, "list_price": 145000}, administrator_id=administrator_id
    )

    # El escenario solo vale si el historial existe de verdad.
    assert db.session.execute(text("SELECT count(*) FROM price_history")).scalar_one() >= 1
    return creado["id"]


# El orden declarado, contra el esquema vivo


def test_el_orden_declarado_cubre_todas_las_tablas_comerciales(schema_app, seed_module):
    """Ninguna tabla con FK hacia otra del reset puede quedar fuera de la lista."""
    with schema_app.app_context():
        dependencias = _fk_dependencies()

    declaradas = set(seed_module.RESET_TABLES)
    faltantes = {
        tabla
        for tabla, padres in dependencias.items()
        if padres & declaradas and tabla not in declaradas and tabla != "audit_logs"
    }

    assert faltantes == set(), f"tablas con FK hacia el reset y sin borrar: {faltantes}"


def test_el_orden_declarado_respeta_las_claves_foraneas(schema_app, seed_module):
    """Cada tabla se vacía antes que aquella a la que apunta (`RESTRICT`)."""
    with schema_app.app_context():
        dependencias = _fk_dependencies()

    posicion = {tabla: indice for indice, tabla in enumerate(seed_module.RESET_TABLES)}
    for tabla, padres in dependencias.items():
        if tabla not in posicion:
            continue
        for padre in padres:
            if padre == tabla or padre not in posicion:
                continue  # auto-referencia, o tabla semilla fuera del reset
            assert (
                posicion[tabla] < posicion[padre]
            ), f"{tabla} apunta a {padre} y debe borrarse antes"


def test_las_dos_listas_de_borrado_coinciden(schema_app, seed_module):
    """El script y la fixture de tests deben vaciar lo mismo, en el mismo orden."""
    from tests.fixtures.catalog import BUSINESS_TABLES

    assert seed_module.RESET_TABLES == BUSINESS_TABLES


# El reset ejecutándose de verdad


def test_el_reset_termina_correctamente_con_historial_de_precios(
    seed_module, catalogo_con_historial
):
    """El caso que fallaba: con `price_history` poblada, el reset se completa."""
    seed_module._reset()

    for tabla in seed_module.RESET_TABLES:
        restantes = db.session.execute(text(f"SELECT count(*) FROM {tabla}")).scalar_one()
        assert restantes == 0, f"{tabla} quedó con {restantes} filas"


def test_el_reset_no_deja_registros_huerfanos(seed_module, catalogo_con_historial):
    """Ni filas colgando de un padre inexistente, ni jerarquías rotas."""
    seed_module._reset()

    huerfanos = (
        db.session.execute(
            text(
                "SELECT (SELECT count(*) FROM price_history ph "
                "        LEFT JOIN products p ON p.id = ph.product_id "
                "        WHERE p.id IS NULL) AS ph, "
                "       (SELECT count(*) FROM images i "
                "        LEFT JOIN products p ON p.id = i.product_id "
                "        WHERE p.id IS NULL) AS img, "
                "       (SELECT count(*) FROM variants v "
                "        LEFT JOIN products p ON p.id = v.product_id "
                "        WHERE p.id IS NULL) AS var, "
                "       (SELECT count(*) FROM categories c "
                "        LEFT JOIN categories padre ON padre.id = c.parent_id "
                "        WHERE c.parent_id IS NOT NULL AND padre.id IS NULL) AS cat"
            )
        )
        .mappings()
        .one()
    )

    assert dict(huerfanos) == {"ph": 0, "img": 0, "var": 0, "cat": 0}


def test_el_reset_preserva_la_auditoria_y_las_semillas(
    seed_module, catalogo_con_historial, administrator_id
):
    """`AD-20`: la auditoría es inmutable y no es dato comercial.

    Sus `entity_id` apuntan a productos ya borrados, pero son enteros sin FK: el
    rastro de quién hizo qué sobrevive al vaciado, que es justo su propósito.
    """
    antes = db.session.execute(
        text("SELECT count(*) FROM audit_logs WHERE administrator_id = :a"),
        {"a": administrator_id},
    ).scalar_one()
    assert antes >= 2  # create + update del producto

    seed_module._reset()

    despues = db.session.execute(
        text("SELECT count(*) FROM audit_logs WHERE administrator_id = :a"),
        {"a": administrator_id},
    ).scalar_one()
    assert despues == antes

    # Las semillas de la migración tampoco son dato comercial.
    for tabla in ("genders", "size_types", "administrators"):
        assert db.session.execute(text(f"SELECT count(*) FROM {tabla}")).scalar_one() > 0
