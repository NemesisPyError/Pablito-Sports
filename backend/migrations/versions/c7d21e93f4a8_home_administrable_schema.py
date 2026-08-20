"""home_administrable_schema

Portada administrable: esquema (04_BASE_DATOS.md v1.1.0).

- brands:         image_path, tagline, home_position          (§9.2.3)
- banners:        button_label, placement                     (§9.2.12)
- store_settings: email, about_title, about_text,
                  about_image_path                            (§9.2.14)
- brand_images:   tabla nueva del collage de portada          (§9.2.18)

Ninguna columna nueva es obligatoria y ninguna existente cambia de tipo ni de
nulabilidad: la migracion no puede invalidar datos ya cargados.

`banners.placement` nace con `server_default='hero'`, de modo que las filas
existentes quedan donde siempre estuvieron. El defecto se conserva a nivel de
base y no solo de modelo, porque la columna es NOT NULL y una insercion que la
omita debe seguir siendo valida.

Migracion de esquema, separada de la de datos (§11.2, regla 3).

Depende de: b3e05f8c41d7_seed_initial_super_administrator.py

Revision ID: c7d21e93f4a8
Revises: b3e05f8c41d7
Create Date: 2026-08-13

"""
import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = 'c7d21e93f4a8'
down_revision = 'b3e05f8c41d7'
branch_labels = None
depends_on = None


def upgrade():
    # --- brands (§9.2.3) -----------------------------------------------
    op.add_column('brands', sa.Column('image_path', sa.String(length=500), nullable=True))
    op.add_column('brands', sa.Column('tagline', sa.String(length=255), nullable=True))
    op.add_column('brands', sa.Column('home_position', sa.Integer(), nullable=True))
    op.create_check_constraint(
        'home_position_valid', 'brands', 'home_position IS NULL OR home_position >= 0'
    )

    # --- banners (§9.2.12) ---------------------------------------------
    op.add_column('banners', sa.Column('button_label', sa.String(length=50), nullable=True))
    op.add_column(
        'banners',
        sa.Column('placement', sa.String(length=20), nullable=False, server_default='hero'),
    )
    op.create_check_constraint(
        'placement_allowed', 'banners', "placement IN ('hero', 'news', 'promo')"
    )
    op.create_index('idx_banners_placement', 'banners', ['placement'])

    # --- store_settings (§9.2.14) --------------------------------------
    op.add_column('store_settings', sa.Column('email', sa.String(length=255), nullable=True))
    op.add_column('store_settings', sa.Column('about_title', sa.String(length=255), nullable=True))
    op.add_column('store_settings', sa.Column('about_text', sa.Text(), nullable=True))
    op.add_column(
        'store_settings', sa.Column('about_image_path', sa.String(length=500), nullable=True)
    )

    # --- brand_images (§9.2.18) ----------------------------------------
    op.create_table(
        'brand_images',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('brand_id', sa.Integer(), nullable=False),
        sa.Column('file_path', sa.String(length=500), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('alt_text', sa.String(length=255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            'created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            'updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(
            ['brand_id'], ['brands.id'], ondelete='RESTRICT', onupdate='CASCADE'
        ),
        sa.CheckConstraint('position >= 0', name='position_non_negative'),
    )
    op.create_index('idx_brand_images_brand_id', 'brand_images', ['brand_id'])


def downgrade():
    op.drop_index('idx_brand_images_brand_id', table_name='brand_images')
    op.drop_table('brand_images')

    op.drop_column('store_settings', 'about_image_path')
    op.drop_column('store_settings', 'about_text')
    op.drop_column('store_settings', 'about_title')
    op.drop_column('store_settings', 'email')

    op.drop_index('idx_banners_placement', table_name='banners')
    op.drop_constraint('placement_allowed', 'banners', type_='check')
    op.drop_column('banners', 'placement')
    op.drop_column('banners', 'button_label')

    op.drop_constraint('home_position_valid', 'brands', type_='check')
    op.drop_column('brands', 'home_position')
    op.drop_column('brands', 'tagline')
    op.drop_column('brands', 'image_path')
