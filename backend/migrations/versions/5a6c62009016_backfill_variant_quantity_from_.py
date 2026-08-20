"""backfill_variant_quantity_from_availability

Migracion de DATOS unicamente (04_BASE_DATOS.md Sec.11.2 regla 3), separada
del esquema de 262d6c50a5e3.

Al momento de escribir esto, `products.availability` es un campo que el
administrador cargaba a mano, sin ninguna cantidad real detras: 8 productos
"available", 2 "low_stock", 1 "out_of_stock" (33 variantes en total, cero
con cantidad cargada). Decision confirmada con el usuario (tanda funcional
del 17/08/2026): en vez de adivinar cifras de inventario reales, el
backfill preserva el estado VISIBLE actual del catalogo para no generar una
regresion (que un producto que hoy se ve "Disponible" pase a "No disponible"
de la nada), y el administrador corrige las cantidades reales despues desde
el panel.

Algoritmo (por producto, sobre sus variantes vivas):
- "available"   -> cada variante recibe quantity = 10 (la suma siempre da
                    > 5 sin importar cuantas variantes tenga el producto).
- "low_stock"   -> UNA sola variante (la de menor id) recibe quantity = 3,
                    el resto se queda en el default de columna (0); asi la
                    suma cae en 1-5 sin importar cuantas variantes tenga el
                    producto (hay productos con 2 y 3 variantes en este
                    estado, verificado antes de escribir esta migracion).
- "out_of_stock" (y "coming_soon", si hubiera quedado alguno) -> no requiere
                    UPDATE: el default de columna ya es 0.

Despues del backfill, se recalcula `products.availability` desde la suma
real de `quantity` (RN-38b) — por construccion da el mismo valor que tenia
antes, y de paso corrige a "out_of_stock" cualquier producto sin ninguna
variante viva (regla explicita del usuario: sin variante = no disponible).

Reversibilidad (04 Sec.11.2 regla 2): el downgrade() deshace exactamente lo
que este archivo escribio (todas las `quantity` vuelven a 0, el default
anterior a esta tanda). No intenta reconstruir la distribucion manual
original de `products.availability` fila por fila porque no queda ningun
rastro de esos valores despues de recalcularlos — no es una perdida real:
el downgrade de esquema de 262d6c50a5e3 elimina la columna `quantity` a
continuacion, momento en el que `products.availability` vuelve a ser, otra
vez, el unico dato que existe.

Revision ID: 5a6c62009016
Revises: 262d6c50a5e3
Create Date: 2026-08-17

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5a6c62009016'
down_revision = '262d6c50a5e3'
branch_labels = None
depends_on = None


def upgrade():
    # "available": todas las variantes vivas del producto reciben 10.
    op.execute(
        sa.text(
            "UPDATE variants v SET quantity = 10 "
            "FROM products p "
            "WHERE v.product_id = p.id AND v.deleted_at IS NULL "
            "AND p.availability = 'available'"
        )
    )

    # "low_stock": solo la variante de menor id del producto recibe 3.
    op.execute(
        sa.text(
            "UPDATE variants SET quantity = 3 WHERE deleted_at IS NULL AND id IN ("
            "SELECT DISTINCT ON (v.product_id) v.id "
            "FROM variants v JOIN products p ON p.id = v.product_id "
            "WHERE v.deleted_at IS NULL AND p.availability = 'low_stock' "
            "ORDER BY v.product_id, v.id"
            ")"
        )
    )

    # Recalcula products.availability desde la suma real de quantity (RN-38b).
    op.execute(
        sa.text(
            "UPDATE products p SET availability = CASE "
            "WHEN COALESCE(totals.total, 0) > 5 THEN 'available' "
            "WHEN COALESCE(totals.total, 0) >= 1 THEN 'low_stock' "
            "ELSE 'out_of_stock' END "
            "FROM (SELECT product_id, SUM(quantity) AS total FROM variants "
            "WHERE deleted_at IS NULL GROUP BY product_id) AS totals "
            "WHERE totals.product_id = p.id"
        )
    )
    # Productos sin ninguna variante viva: sin variante = no disponible.
    op.execute(
        sa.text(
            "UPDATE products SET availability = 'out_of_stock' WHERE id NOT IN ("
            "SELECT DISTINCT product_id FROM variants WHERE deleted_at IS NULL"
            ")"
        )
    )


def downgrade():
    op.execute(sa.text("UPDATE variants SET quantity = 0"))
