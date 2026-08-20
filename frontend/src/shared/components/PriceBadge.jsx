import { formatGuaranies } from '../formatters/currency.js';
import styles from './PriceBadge.module.css';

/**
 * Muestra precio de lista, precio de oferta y descuento.
 *
 * No calcula precios; solo renderiza los valores recibidos.
 *
 * `showDiscount` permite suprimir el porcentaje donde ya se muestra en otro
 * lado: la tarjeta de producto lo lleva como distintivo sobre la imagen
 * (09_COMPONENTES.md §9.8, anatomía de `ProductCard`), y repetirlo en la
 * línea de precio sería decir dos veces lo mismo.
 */
export function PriceBadge({
  listPrice,
  salePrice,
  discountPercentage,
  size = 'md',
  showDiscount = true,
}) {
  const hasDiscount = salePrice != null && salePrice < listPrice;
  const effectivePrice = hasDiscount ? salePrice : listPrice;

  return (
    <p className={`${styles.row} ${size === 'lg' ? styles.sizeLg : ''}`}>
      <span className={`${styles.current} ${hasDiscount ? styles.currentSale : ''}`}>
        {formatGuaranies(effectivePrice)}
      </span>

      {hasDiscount && (
        <>
          {/* `<s>` aporta el significado; el tachado visual es consecuencia. */}
          <s className={styles.list}>
            <span className="visually-hidden">Precio anterior: </span>
            {formatGuaranies(listPrice)}
          </s>

          {showDiscount && discountPercentage != null && (
            <span className={styles.discount}>-{discountPercentage}%</span>
          )}
        </>
      )}
    </p>
  );
}
