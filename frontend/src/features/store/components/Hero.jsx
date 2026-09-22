import { Link } from 'react-router-dom';

import { Image } from '../../../shared/components/Image.jsx';
import { heroPrimaryAction, PROMOTIONS_HREF } from '../utils/heroActions.js';
import styles from './Hero.module.css';

/**
 * Una pieza de portada (09_COMPONENTES.md §9.8).
 *
 * Renderiza un único banner; no decide cuál. Con una sola pieza en la zona
 * `hero`, `HomePage` la monta directo. Con varias, `HeroCarousel` la usa como
 * la vista de "pieza actual" y agrega la rotación, los controles y el
 * temporizador — este componente no sabe que existe un carrusel alrededor.
 *
 * No asume `description` ni identificador público: el contrato real es
 * `title`, `subtitle`, `image_url`, `link_url`, `button_label`, `placement` y
 * `position` (§10.3).
 */
export function Hero({ banner, titleId = 'hero-title' }) {
  if (!banner) return null;

  // Derivada del `banner` recibido por props: al rotar la pieza, el carrusel
  // vuelve a renderizar con otro `banner` y la acción se recalcula sola. No hay
  // estado propio que pueda quedarse con el enlace de la pieza anterior.
  const principal = heroPrimaryAction(banner);

  const texto = (
    <div className={styles.inner}>
      <h2 id={titleId} className={styles.title}>
        {banner.title}
      </h2>

      {banner.subtitle && <p className={styles.subtitle}>{banner.subtitle}</p>}

      <div className={styles.actions}>
        <Link
          to={principal.href}
          className={`${styles.action} ${styles.actionPrimary}`}
          data-testid="hero-cta-primary"
        >
          {principal.label}
        </Link>

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
          // `contain`, no `cover`: el administrador sube piezas gráficas con
          // texto propio ya compuesto en la imagen (no solo fotos), y en el
          // recuadro vertical de mobile (`--aspect-hero: 4/5`) un banner
          // panorámico con `cover` deja ver apenas el tercio central del
          // ancho — corta justo el texto de los bordes. `contain` nunca
          // recorta contenido, a costa de dejar ver el fondo del hero a los
          // lados cuando la proporción no coincide.
          objectFit="contain"
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
