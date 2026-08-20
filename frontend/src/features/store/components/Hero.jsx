import { Link } from 'react-router-dom';

import { Image } from '../../../shared/components/Image.jsx';
import { catalogHref } from '../utils/navAxes.js';
import styles from './Hero.module.css';

/**
 * Texto del botón cuando el administrador cargó el enlace pero no la etiqueta.
 *
 * `04 §9.2.12`: la ausencia de etiqueta no debe dejar el hero sin salida.
 */
const DEFAULT_BUTTON_LABEL = 'Ver colección';

/** Segunda llamada a la acción, fija: siempre lleva a las ofertas vigentes. */
const PROMOTIONS_HREF = catalogHref({ onSale: true });

/**
 * Pieza de portada (09_COMPONENTES.md §9.8).
 *
 * **Una sola imagen, no un carrusel.** La portada abre con una afirmación; una
 * rotación obliga a esperar para leerla entera y mueve el contenido bajo el
 * puntero. Si hay varias piezas en la zona `hero`, se publica la de menor
 * `position`, que es el orden que fija el administrador.
 *
 * No asume `description` ni identificador público: el contrato real es
 * `title`, `subtitle`, `image_url`, `link_url`, `button_label`, `placement` y
 * `position` (§10.3).
 */
export function Hero({ banner, titleId = 'hero-title' }) {
  if (!banner) return null;

  const enlace = banner.link_url?.trim();
  const etiqueta = banner.button_label?.trim() || DEFAULT_BUTTON_LABEL;

  const texto = (
    <div className={styles.inner}>
      <h2 id={titleId} className={styles.title}>
        {banner.title}
      </h2>

      {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}

      <div className={styles.actions}>
        {/* Sin enlace no hay botón principal: un botón que no lleva a ninguna
            parte es peor que su ausencia. */}
        {enlace && (
          <Link to={enlace} className={`${styles.action} ${styles.actionPrimary}`}>
            {etiqueta}
          </Link>
        )}

        <Link to={PROMOTIONS_HREF} className={`${styles.action} ${styles.actionSecondary}`}>
          Promociones
        </Link>
      </div>
    </div>
  );

  if (!banner.image_url) {
    return (
      <section className={`${styles.hero} ${styles.plain}`} aria-labelledby={titleId}>
        {texto}
      </section>
    );
  }

  return (
    <section className={styles.hero} aria-labelledby={titleId}>
      <div className={styles.media}>
        <Image
          src={banner.image_url}
          // El titular ya dice lo mismo justo encima: repetirlo en el `alt`
          // haría que el lector de pantalla lo anuncie dos veces.
          alt=""
          aspectRatio="hero"
          objectFit="cover"
          sizes="100vw"
          // Es el LCP de la portada: ni diferida ni en la cola del resto.
          lazy={false}
          fetchPriority="high"
        />
        <div className={styles.veil} />
      </div>

      <div className={styles.content}>{texto}</div>
    </section>
  );
}
