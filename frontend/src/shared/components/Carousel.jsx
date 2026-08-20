import { Children, useCallback, useEffect, useRef, useState } from 'react';

import { computeScrollState, scrollBehavior, scrollStep } from '../utils/carouselMetrics.js';
import styles from './Carousel.module.css';

const METRIC_CLASS = {
  products: styles.metricProducts,
  brands: styles.metricBrands,
  categories: styles.metricCategories,
  single: styles.metricSingle,
};

const INITIAL_STATE = {
  overflowing: false,
  canScrollPrevious: false,
  canScrollNext: false,
};

/** §8: hasta que exista biblioteca de íconos, los glifos del sistema son SVG. */
function Chevron({ direction }) {
  const path = direction === 'previous' ? 'M15 4 L7 12 L15 20' : 'M9 4 L17 12 L9 20';

  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

/**
 * Carril horizontal con `scroll-snap` nativo (09_COMPONENTES.md §9.8).
 *
 * `UDS-08`: el desplazamiento táctil, la inercia y el ajuste los resuelve el
 * navegador. Acá no hay biblioteca, ni reproducción automática, ni clonado de
 * piezas para simular un bucle infinito: duplicar nodos rompe el orden de
 * tabulación y confunde a los lectores de pantalla (`COMPP-04`).
 *
 * El carril no recibe `tabindex`: cada pieza ya es focoable y el navegador la
 * desplaza sola al recibir el foco.
 */
export function Carousel({
  children,
  label,
  metric = 'products',
  controls = true,
  bleed = false,
  className = '',
}) {
  const trackRef = useRef(null);
  const [state, setState] = useState(INITIAL_STATE);

  const items = Children.toArray(children);
  const showControls = controls && state.overflowing;

  const syncState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    setState(
      computeScrollState({
        scrollLeft: track.scrollLeft,
        scrollWidth: track.scrollWidth,
        clientWidth: track.clientWidth,
      }),
    );
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    syncState();

    // El desbordamiento cambia con el ancho de la ventana, con la métrica de
    // cada breakpoint (§7.6) y con la llegada de datos: hay que re-medir en
    // los tres casos, no solo al montar.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncState);
    observer?.observe(track);

    track.addEventListener('scroll', syncState, { passive: true });

    return () => {
      observer?.disconnect();
      track.removeEventListener('scroll', syncState);
    };
  }, [syncState, items.length]);

  const scrollTo = (direction) => {
    const track = trackRef.current;
    if (!track) return;

    const prefersReducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    track.scrollBy({
      left: scrollStep({ clientWidth: track.clientWidth, direction }),
      behavior: scrollBehavior(prefersReducedMotion),
    });
  };

  if (items.length === 0) return null;

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {showControls && (
        <button
          type="button"
          className={`${styles.control} ${styles.controlPrevious}`}
          onClick={() => scrollTo('previous')}
          disabled={!state.canScrollPrevious}
          aria-label="Anterior"
        >
          <Chevron direction="previous" />
        </button>
      )}

      <div
        ref={trackRef}
        className={[
          styles.track,
          METRIC_CLASS[metric] ?? METRIC_CLASS.products,
          showControls ? styles.trackWithControls : '',
          bleed ? styles.bleed : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role="group"
        aria-roledescription="carrusel"
        aria-label={label}
      >
        {items.map((item, index) => (
          // El índice es la posición dentro del carril y no reordena nada: la
          // identidad de cada pieza la aporta su propio `key` interno.
          <div key={index} className={styles.item}>
            {item}
          </div>
        ))}
      </div>

      {showControls && (
        <button
          type="button"
          className={`${styles.control} ${styles.controlNext}`}
          onClick={() => scrollTo('next')}
          disabled={!state.canScrollNext}
          aria-label="Siguiente"
        >
          <Chevron direction="next" />
        </button>
      )}
    </div>
  );
}
