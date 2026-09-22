import { Carousel } from '../../../shared/components/Carousel.jsx';
import { MediaTile } from '../../../shared/components/MediaTile.jsx';
import { useBrands } from '../../catalog/hooks/useBrands.js';
import { catalogHref } from '../utils/navAxes.js';
import styles from './BrandStrip.module.css';

/**
 * Franja de marcas bajo la navegación (09_COMPONENTES.md §9.8 `BrandRail`).
 *
 * Muestra las marcas que el administrador marcó con «Mostrar en la franja de
 * marcas» (`show_in_strip`, pedido explícito del usuario). Antes mostraba todas
 * las activas sin forma de elegir; la columna nace en `TRUE` para que esa
 * selección arranque siendo la de siempre.
 *
 * El filtro se hace acá y no en `GET /brands`: ese endpoint lo comparten el
 * filtro de marca del catálogo y el mega-menú, que necesitan la lista completa.
 * Es independiente de `home_position`, que decide otra cosa —si la marca tiene
 * bloque propio con collage en la portada—.
 *
 * Cada pieza usa `MediaTile`, de modo que las marcas sin logotipo cargado se
 * ven como nombre compuesto tipográficamente en lugar de dejar un hueco
 * (`UDS-09`).
 */
export function BrandStrip() {
  const { data: marcas } = useBrands();

  const enLaFranja = (marcas ?? []).filter((marca) => marca.show_in_strip);

  // Sin marcas no hay franja: una tira vacía con su filete sería una línea
  // suelta bajo el navbar.
  if (enLaFranja.length === 0) return null;

  return (
    <div className={styles.strip}>
      <div className={styles.inner}>
        <Carousel label="Marcas" metric="brands" bleed>
          {enLaFranja.map((marca) => (
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
