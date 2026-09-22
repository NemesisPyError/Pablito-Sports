import { useEffect, useState } from 'react';

import { AUTOPLAY_INTERVAL_MS, shouldAutoplay, wrapIndex } from '../utils/heroCarouselMetrics.js';
import { Hero } from './Hero.jsx';
import styles from './HeroCarousel.module.css';

/**
 * Rotación de piezas de portada (09_COMPONENTES.md §9.8 `Hero`, corrección
 * v2.7.0: la Home vuelve a admitir varias piezas en la zona `hero`).
 *
 * Con una sola pieza (o ninguna) no hay carrusel que armar: se delega
 * directo en `Hero`, sin controles ni temporizador, que es exactamente el
 * comportamiento previo a esta corrección.
 *
 * Sin flechas: el hero es una pieza de contenido, no un carril de piezas
 * chicas, y una flecha superpuesta compite con el título y el botón que ya
 * ocupan los bordes. Los indicadores alcanzan para navegar manualmente y no
 * chocan con el texto (§14.1). El avance automático reinicia su
 * temporizador en cada cambio de pieza, manual o automático (`safeIndex` en
 * las dependencias del efecto): un clic en un indicador no compite con el
 * siguiente avance programado, que vuelve a contar 4,5s completos desde ese
 * clic.
 */
export function HeroCarousel({ banners = [], titleId = 'hero-title' }) {
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const safeIndex = wrapIndex(index, count);

  useEffect(() => {
    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    if (!shouldAutoplay({ count, isPaused, prefersReducedMotion })) return undefined;

    const timerId = window.setInterval(() => {
      setIndex((current) => wrapIndex(current + 1, count));
    }, AUTOPLAY_INTERVAL_MS);

    return () => window.clearInterval(timerId);
  }, [count, isPaused, safeIndex]);

  if (count === 0) return null;
  if (count === 1) return <Hero banner={banners[0]} titleId={titleId} />;

  const goTo = (nextIndex) => setIndex(wrapIndex(nextIndex, count));

  return (
    <div
      className={styles.wrapper}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {/* `key` fuerza el remonte: es lo que dispara el fade de entrada de
          `.slide` y evita apilar todas las piezas a la vez, que dejaría la
          altura del carrusel sin poder calcularse (cada pieza mide su alto
          por su propia imagen). */}
      <div key={safeIndex} className={styles.slide}>
        <Hero banner={banners[safeIndex]} titleId={titleId} />
      </div>

      <div className={styles.dots} role="tablist" aria-label="Piezas de portada">
        {banners.map((banner, i) => (
          <button
            key={`${banner.position}-${banner.title}`}
            type="button"
            role="tab"
            aria-selected={i === safeIndex}
            aria-label={`Ir a la pieza ${i + 1} de ${count}`}
            className={`${styles.dot} ${i === safeIndex ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
