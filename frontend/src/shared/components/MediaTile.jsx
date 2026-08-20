import { Link } from 'react-router-dom';

import styles from './MediaTile.module.css';

const ASPECT_CLASS = {
  brand: styles.aspectBrand,
  category: styles.aspectCategory,
};

/**
 * Pieza de contenido con imagen administrable (09_COMPONENTES.md §9.8).
 *
 * Contrato `{ name, href, imageUrl }`, el mismo con el que la portada dibuja
 * marcas y categorías. **No incrusta rutas de imagen fijas** (`UDS-09`,
 * `VIS-08`): cuando `imageUrl` es nulo renderiza la variante tipográfica, que
 * es un estado normal y no un error.
 *
 * `alt` va vacío a propósito: el nombre ya viaja como texto accesible del
 * enlace, y repetirlo haría que el lector de pantalla lo anuncie dos veces.
 */
export function MediaTile({
  name,
  href,
  imageUrl,
  aspect = 'brand',
  eyebrow,
  tone = 'light',
  className = '',
  onClick,
}) {
  const clases = [
    styles.tile,
    ASPECT_CLASS[aspect] ?? ASPECT_CLASS.brand,
    tone === 'inverse' ? styles.toneInverse : '',
    imageUrl ? '' : styles.fallback,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Link to={href} className={clases} onClick={onClick}>
      {imageUrl ? (
        <img src={imageUrl} alt="" className={styles.image} loading="lazy" decoding="async" />
      ) : (
        <span className={styles.wordmark}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          {name}
        </span>
      )}
      {imageUrl && <span className="visually-hidden">{name}</span>}
    </Link>
  );
}
