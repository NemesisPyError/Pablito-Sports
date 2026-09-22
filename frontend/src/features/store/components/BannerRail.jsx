import { Link } from 'react-router-dom';

import { Carousel } from '../../../shared/components/Carousel.jsx';
import { Section } from '../../../shared/components/Section.jsx';
import { SectionHeader } from '../../../shared/components/SectionHeader.jsx';
import { safeHref } from '../../../shared/utils/safeLink.js';
import { useBanners } from '../hooks/useBanners.js';
import styles from './BannerRail.module.css';

/**
 * Carril de piezas administrables de una zona de la portada (§7.2).
 *
 * Las piezas son campañas que el administrador arma desde el panel —imagen,
 * título, texto de apoyo y enlace—, no productos del catálogo: por eso la zona
 * viaja como `placement` y no como filtro de productos.
 *
 * Una zona sin piezas **no dibuja nada**: ni encabezado ni carril vacío.
 */
export function BannerRail({ id, eyebrow, title, placement, href, tone = 'default' }) {
  const { data: piezas } = useBanners(placement);

  if (!piezas || piezas.length === 0) return null;

  return (
    <Section labelledBy={id} tone={tone}>
      <SectionHeader id={id} eyebrow={eyebrow} title={title} href={href} />

      <div className={styles.carouselFrame}>
        <Carousel label={title} metric="categories" bleed>
          {piezas.map((pieza) => (
            // `position` no es único: `banners` no tiene una restricción que lo
            // exija (§9.6 de 04_BASE_DATOS.md) y el admin puede repetirlo dentro
            // de la misma zona. `title` desempata sin requerir el `id`, que
            // AD-12 excluye a propósito del contrato público.
            <BannerCard
              key={`${pieza.placement}-${pieza.position}-${pieza.title}`}
              banner={pieza}
            />
          ))}
        </Carousel>

        {/* Desenfoque decorativo en los bordes: sugiere que el carril
            continúa más allá de lo visible. Solo desde `lg`, que es donde
            `bleed` deja de estirar el carril más allá de este marco (§14.2)
            y el borde vuelve a coincidir con el del carril real. */}
        <span className={`${styles.edgeBlur} ${styles.edgeBlurStart}`} aria-hidden="true" />
        <span className={`${styles.edgeBlur} ${styles.edgeBlurEnd}`} aria-hidden="true" />
      </div>
    </Section>
  );
}

/**
 * Pieza suelta del carril.
 *
 * Sin `link_url` la pieza no es accionable y se renderiza como bloque: un
 * enlace que no lleva a ninguna parte confunde al teclado y al lector de
 * pantalla.
 *
 * El destino pasa por `safeHref`, el mismo validador que usa el `Hero`: el
 * backend acota la **longitud** de `link_url` pero no el esquema, así que un
 * `javascript:` guardado llegaba tal cual al `href`. Un enlace que no supera el
 * saneamiento se trata exactamente como la ausencia de enlace —la tarjeta pasa
 * a ser un bloque, que es el camino que ya existía—: no se inventa un destino
 * alternativo ni se deja un `href` a medias.
 *
 * `safeHref` acepta cualquier tipo. Eso también arregla que un `link_url` que
 * no fuera texto rompiera el render: `42?.trim()` lanza `TypeError`, y el
 * encadenamiento opcional no protege de eso porque el valor no es nulo.
 */
export function BannerCard({ banner }) {
  const enlace = safeHref(banner.link_url);
  const etiqueta = typeof banner.button_label === 'string' ? banner.button_label.trim() : '';

  const contenido = (
    <>
      {banner.image_url ? (
        <div className={styles.media}>
          <img
            src={banner.image_url}
            alt=""
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.veil} />
        </div>
      ) : (
        <div className={styles.plain} />
      )}

      <div className={styles.content}>
        <p className={styles.title}>{banner.title}</p>
        {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}
        {enlace && <span className={styles.cue}>{etiqueta || 'Ver más'}</span>}
      </div>
    </>
  );

  if (!enlace) {
    return <div className={styles.card}>{contenido}</div>;
  }

  return (
    <Link to={enlace} className={styles.card}>
      {contenido}
    </Link>
  );
}
