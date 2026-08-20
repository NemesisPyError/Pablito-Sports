import { useState } from 'react';

import { buildFallbackSrcSet, buildSrcSet } from '../utils/imageSources.js';
import styles from './Image.module.css';

const RATIO_MAP = {
  '1 / 1': styles.ratio1x1,
  '4 / 3': styles.ratio4x3,
  '16 / 9': styles.ratio16x9,
  '21 / 9': styles.ratio21x9,
  // Token de §7.5: vertical en móvil, panorámico en escritorio.
  hero: styles.ratioHero,
};

const FIT_MAP = {
  cover: styles.objectCover,
  contain: styles.objectContain,
};

/**
 * Imagen optimizada con fallback y carga diferida.
 *
 * Aplica `loading="lazy"` fuera de la primera pantalla y reserva espacio
 * mediante la relación de aspecto del contenedor.
 */
export function Image({
  src,
  alt,
  className = '',
  aspectRatio = '1 / 1',
  lazy = true,
  objectFit = 'cover',
  sizes = '100vw',
  // Para el LCP de la pantalla. `high` adelanta la descarga frente al resto de
  // las imágenes; el defecto (`auto`) deja que el navegador decida.
  fetchPriority = 'auto',
}) {
  const [hasError, setHasError] = useState(false);
  const ratioClass = RATIO_MAP[aspectRatio] ?? RATIO_MAP['1 / 1'];
  const fitClass = FIT_MAP[objectFit] ?? FIT_MAP.cover;

  if (!src || hasError) {
    return (
      <div
        className={`d-flex align-items-center justify-content-center bg-light text-muted ${ratioClass} ${className}`}
      >
        <span className="small">Sin imagen</span>
      </div>
    );
  }

  // §17.1.6: los tres anchos se deducen del nombre del derivado canónico. Si la
  // URL no sigue la convención, ambos quedan `undefined` y se sirve tal cual.
  const srcSet = buildSrcSet(src);
  const fallbackSrcSet = buildFallbackSrcSet(src);

  return (
    <div className={`${styles.container} ${ratioClass} ${className}`}>
      {/* §17.1.2: WebP con respaldo tradicional, resuelto por el navegador. */}
      <picture>
        {srcSet && <source type="image/webp" srcSet={srcSet} sizes={sizes} />}
        {fallbackSrcSet && <source type="image/jpeg" srcSet={fallbackSrcSet} sizes={sizes} />}
        <img
          src={src}
          alt={alt || ''}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          // react-dom 18.3.1 does not special-case `fetchPriority` (absent from
          // its DOM property config, verified in source), so an unrecognized
          // camelCase attribute is silently dropped instead of rendered. The
          // lowercase HTML attribute is required for it to ever reach the <img>
          // tag. The lint rule below assumes React 19's recognized-prop casing;
          // revisit once this project upgrades past 18.3.
          // eslint-disable-next-line react/no-unknown-property
          fetchpriority={fetchPriority}
          className={`w-100 h-100 ${fitClass}`}
          onError={() => setHasError(true)}
        />
      </picture>
    </div>
  );
}
