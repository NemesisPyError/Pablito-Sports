import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AvailabilityBadge } from '../../../shared/components/AvailabilityBadge.jsx';
import { Image } from '../../../shared/components/Image.jsx';
import { PriceBadge } from '../../../shared/components/PriceBadge.jsx';
import styles from './ProductCard.module.css';

const VARIANT_CLASS = {
  grid: styles.variantGrid,
  rail: styles.variantRail,
  compact: styles.variantCompact,
};

/**
 * §7.5: la tarjeta nunca ocupa el ancho completo. Se declara qué porción de
 * la ventana ocupa en cada tramo para que el navegador elija el derivado más
 * chico que sirva, en lugar del más grande disponible.
 */
const IMAGE_SIZES = '(min-width: 992px) 20vw, (min-width: 768px) 30vw, 45vw';

/**
 * Tarjeta de producto para listados y carriles.
 *
 * 09_COMPONENTES.md §9.8: no calcula precios, no llama a la API y no cambia
 * de estructura según el viewport —`variant` es una decisión de composición
 * de quien la usa, no del ancho de pantalla—.
 *
 * No expone acción de agregar al carrito: `RN-53` fija la variante como
 * unidad del carrito y `ProductListItemDTO` no trae variantes, de modo que
 * agregar desde el listado obligaría a elegir un talle por el cliente. La
 * selección vive en la ficha, donde está `VariantSelector`.
 */
export function ProductCard({ product, variant = 'grid', priority = false }) {
  const hasDiscount = product.sale_price != null && product.sale_price < product.list_price;
  const [enHover, setEnHover] = useState(false);

  return (
    <article className={`${styles.card} ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.grid}`}>
      <div
        className={styles.media}
        onMouseEnter={() => setEnHover(true)}
        onMouseLeave={() => setEnHover(false)}
      >
        <div className={styles.badges}>
          {hasDiscount && product.discount_percentage != null && (
            <span className={`${styles.badge} ${styles.badgeSale}`}>
              -{product.discount_percentage}%
            </span>
          )}
          {product.is_new && <span className={`${styles.badge} ${styles.badgeNew}`}>Nuevo</span>}
        </div>

        <Image
          src={product.thumbnail_url}
          alt={product.name}
          aspectRatio="1 / 1"
          objectFit="contain"
          sizes={IMAGE_SIZES}
          lazy={!priority}
          fetchPriority={priority ? 'high' : 'auto'}
        />

        {/* Segunda foto del producto: aparece con hover, mismo recuadro que
            la principal. Sin segunda foto no se monta nada. */}
        {product.secondary_thumbnail_url && (
          <Image
            src={product.secondary_thumbnail_url}
            alt=""
            aspectRatio="1 / 1"
            objectFit="contain"
            sizes={IMAGE_SIZES}
            className={`${styles.hoverImage} ${enHover ? styles.hoverImageVisible : ''}`}
          />
        )}
      </div>

      <div className={styles.body}>
        {product.brand?.name && <p className={styles.brand}>{product.brand.name}</p>}

        <h3 className={styles.name}>
          <Link to={`/producto/${product.slug}`} className={styles.link}>
            {product.name}
          </Link>
        </h3>

        <div className={styles.footer}>
          <PriceBadge
            listPrice={product.list_price}
            salePrice={product.sale_price}
            discountPercentage={product.discount_percentage}
            showDiscount={false}
          />

          {/* «Disponible» es lo esperable: decirlo es ruido. Solo se anuncia
              lo que cambia la decisión de compra. */}
          {product.availability !== 'available' && (
            <div>
              <AvailabilityBadge availability={product.availability} />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
