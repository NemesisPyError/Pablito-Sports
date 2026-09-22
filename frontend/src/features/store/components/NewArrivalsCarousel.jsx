import { Carousel } from '../../../shared/components/Carousel.jsx';
import { Section } from '../../../shared/components/Section.jsx';
import { SectionHeader } from '../../../shared/components/SectionHeader.jsx';
import { IMAGE_SWAP_HINT_TEXT, ProductCard } from '../../catalog/components/ProductCard.jsx';
import { useHomeNewProducts } from '../hooks/useHomeNewProducts.js';
import styles from './NewArrivalsCarousel.module.css';

/**
 * Novedades (09_COMPONENTES.md §9.8): selección editorial de **productos**.
 *
 * Reemplaza al carril de banners que ocupaba esta zona (`BannerRail
 * placement="news"`, ver nota de corrección en `HomePage`). Solo publica lo
 * que el administrador sumó a mano desde "Agregar a novedades" en el
 * listado de productos del panel, en el orden en que los fue seleccionando
 * — no hay automatismo con `is_new`, que sigue siendo el autotoggle del
 * producto que alimenta su insignia "Nuevo" y el filtro del catálogo.
 *
 * Sin selección **no dibuja nada**, mismo criterio que el resto de la
 * portada: ni encabezado ni carril vacío.
 */
export function NewArrivalsCarousel({ id, eyebrow, title, href, tone = 'default' }) {
  const { data: productos } = useHomeNewProducts();

  if (!productos || productos.length === 0) return null;

  // Mismo criterio que `ProductRail`: un símbolo por carril alcanza con que
  // uno de los productos elegidos tenga segunda foto.
  const hayFotoParaCambiar = productos.some((producto) => producto.secondary_thumbnail_url);

  return (
    <Section labelledBy={id} tone={tone}>
      <SectionHeader
        id={id}
        eyebrow={eyebrow}
        title={title}
        href={href}
        hint={hayFotoParaCambiar ? IMAGE_SWAP_HINT_TEXT : undefined}
      />

      <div className={styles.carouselFrame}>
        {/* `categories`: piezas grandes y editoriales, una dominante con
            apenas un asomo de la siguiente — el mismo tamaño con el que esta
            zona ya se presentaba como carril de banners. */}
        <Carousel label={title} metric="categories" bleed>
          {productos.map((producto) => (
            <ProductCard key={producto.slug} product={producto} variant="grid" />
          ))}
        </Carousel>

        {/* Desenfoque decorativo en los bordes: sugiere que el carril
            continúa más allá de lo visible. Mismo recurso que `BannerRail`,
            un poco más marcado porque acá compite con tarjetas claras en vez
            de con la tinta de una campaña. Solo desde `lg`: por debajo,
            `bleed` estira el carril más allá de este marco (§14.2) y el
            borde deja de coincidir con el del carril real. */}
        <span className={`${styles.edgeFade} ${styles.edgeFadeStart}`} aria-hidden="true" />
        <span className={`${styles.edgeFade} ${styles.edgeFadeEnd}`} aria-hidden="true" />
      </div>
    </Section>
  );
}
