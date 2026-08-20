"""merge_variant_color_duplicates

Migracion de DATOS unicamente (04_BASE_DATOS.md Sec.11.2 regla 3), separada
del esquema que retira `colors` en d20b530ad8a6.

Pedido del administrador (tanda del 19/08/2026): eliminacion completa de
"colores". La variante pasa a ser Producto + Talle (RN-13 revisada); el
indice unico `uq_variants_product_color_size` se reemplaza por
`uq_variants_product_size` en la migracion siguiente.

Antes de ese cambio de esquema hay que resolver los casos donde dos
variantes vivas del mismo producto y talle solo se diferenciaban por color
-- iban a colisionar contra la nueva restriccion unica. Verificado contra la
base de datos de desarrollo antes de escribir esta migracion: 13 grupos con
ese patron, todas variantes de prueba (datos comerciales no se siembran,
04 Sec.11.3), ninguna con historial de venta real que perder.

Regla de fusion (por grupo product_id + talle): la `quantity` de las
variantes se suma en la de menor `id` -- consistente con como ya se deriva
`products.availability`, la suma de las cantidades vivas (RN-38b) -- y el
resto se borra. No es un merge inventado: es la misma cantidad total que
ya se contaba antes de este cambio, solo que repartida en menos filas.

Reversibilidad (04 Sec.11.2 regla 2): **no reversible**. La fusion descarta
que color llevaba cada cantidad, y esa asociacion no se puede reconstruir
una vez borrada -- ademas la propia tabla `colors` desaparece en la
migracion siguiente. El downgrade queda documentado como no-op a proposito,
no fue un olvido.

Revision ID: add2a263a249
Revises: 230ed82d06ed
Create Date: 2026-08-19 22:13:05.718405

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add2a263a249'
down_revision = '230ed82d06ed'
branch_labels = None
depends_on = None


def upgrade():
    # La variante de menor id de cada grupo (product_id, talle) recibe la
    # suma de las cantidades del grupo.
    op.execute(
        sa.text(
            "UPDATE variants v SET quantity = sub.total_qty "
            "FROM ("
            "  SELECT product_id, COALESCE(size_id, 0) AS size_key, "
            "         MIN(id) AS keep_id, SUM(quantity) AS total_qty "
            "  FROM variants "
            "  WHERE deleted_at IS NULL "
            "  GROUP BY product_id, COALESCE(size_id, 0) "
            "  HAVING COUNT(*) > 1"
            ") AS sub "
            "WHERE v.id = sub.keep_id"
        )
    )

    # El resto del grupo se borra: ya quedo representado en la que sobrevive.
    op.execute(
        sa.text(
            "DELETE FROM variants v USING ("
            "  SELECT id, "
            "         MIN(id) OVER (PARTITION BY product_id, COALESCE(size_id, 0)) AS keep_id "
            "  FROM variants "
            "  WHERE deleted_at IS NULL"
            ") AS sub "
            "WHERE v.id = sub.id AND v.id <> sub.keep_id"
        )
    )


def downgrade():
    # No reversible: ver docstring del modulo.
    pass
