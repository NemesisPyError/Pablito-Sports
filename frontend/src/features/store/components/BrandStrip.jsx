import { Carousel } from '../../../shared/components/Carousel.jsx';
import { MediaTile } from '../../../shared/components/MediaTile.jsx';
import { useBrands } from '../../catalog/hooks/useBrands.js';
import { catalogHref } from '../utils/navAxes.js';
import styles from './BrandStrip.module.css';

/**
 * Franja de marcas bajo la navegación (09_COMPONENTES.md §9.8 `BrandRail`).
 *
 * Muestra **todas** las marcas activas del catálogo, no solo las destacadas:
 * es un acceso rápido, y la selección curada vive en los bloques de marca.
 *
 * Cada pieza usa `MediaTile`, de modo que las marcas sin logotipo cargado se
 * ven como nombre compuesto tipográficamente en lugar de dejar un hueco
 * (`UDS-09`).
 */
export function BrandStrip() {
  const { data: marcas } = useBrands();

  // Sin marcas no hay franja: una tira vacía con su filete sería una línea
  // suelta bajo el navbar.
  if (!marcas || marcas.length === 0) return null;

  return (
    <div className={styles.strip}>
      <div className={styles.inner}>
        <Carousel label="Marcas" metric="brands" bleed>
          {marcas.map((marca) => (
            <MediaTile
              key={marca.slug}
              name={marca.name}
              href={catalogHref({ brand: marca.slug })}
              imageUrl={marca.image_url}
              aspect="brand"
              className={styles.tile}
            />
          ))}
        </Carousel>
      </div>
    </div>
  );
}
