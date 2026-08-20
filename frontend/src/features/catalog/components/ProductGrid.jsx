import { ProductCard } from './ProductCard.jsx';
import styles from './ProductGrid.module.css';

/**
 * Grilla responsiva de productos.
 *
 * `priorityCount` marca cuántas tarjetas del comienzo cargan su imagen sin
 * diferir: son las que entran en la primera pantalla y una de ellas suele ser
 * el LCP del catálogo. El resto se difiere.
 */
export function ProductGrid({ products, priorityCount = 0 }) {
  return (
    <div className={styles.grid}>
      {products.map((product, index) => (
        <ProductCard key={product.slug} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
