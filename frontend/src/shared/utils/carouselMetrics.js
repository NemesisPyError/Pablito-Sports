/**
 * Cálculos del carril de carrusel (09_COMPONENTES.md §9.8 `Carousel`).
 *
 * Viven fuera del componente porque son la única parte con lógica real: el
 * gesto lo resuelve el navegador con `scroll-snap` (`UDS-08`) y el resto del
 * componente es marcado. Aisladas, se pueden verificar sin montar React.
 */

/**
 * Tolerancia en píxeles.
 *
 * El desplazamiento real llega en decimales por el zoom del navegador y por el
 * redondeo de anchos fraccionarios (§7.6 muestra 2.2 piezas a propósito). Sin
 * margen, el último tramo del carril deja el botón "siguiente" habilitado para
 * un desplazamiento de medio píxel que el usuario no percibe.
 */
export const SCROLL_TOLERANCE = 2;

/**
 * ¿El contenido excede el ancho visible?
 *
 * Es la condición que decide si los controles existen: sin desbordamiento no
 * se renderizan, para no ofrecer un botón que no lleva a ninguna parte.
 */
export function hasOverflow({ scrollWidth = 0, clientWidth = 0 } = {}) {
  return scrollWidth - clientWidth > SCROLL_TOLERANCE;
}

/**
 * Estado de los controles a partir de la posición del carril.
 *
 * `scrollLeft` es negativo en documentos de derecha a izquierda; se compara
 * por valor absoluto para que el cálculo no dependa de la dirección.
 */
export function computeScrollState({ scrollLeft = 0, scrollWidth = 0, clientWidth = 0 } = {}) {
  const overflowing = hasOverflow({ scrollWidth, clientWidth });
  const position = Math.abs(scrollLeft);
  const maxPosition = scrollWidth - clientWidth;

  return {
    overflowing,
    canScrollPrevious: overflowing && position > SCROLL_TOLERANCE,
    canScrollNext: overflowing && position < maxPosition - SCROLL_TOLERANCE,
  };
}

/**
 * Desplazamiento de un paso, en píxeles y con signo.
 *
 * Un paso es una pantalla completa del carril: mantiene la referencia visual
 * porque la pieza que quedaba a la vista en el borde pasa a encabezar la
 * siguiente tanda.
 */
export function scrollStep({ clientWidth = 0, direction = 'next' } = {}) {
  return direction === 'previous' ? -clientWidth : clientWidth;
}

/**
 * Comportamiento del desplazamiento programado.
 *
 * `08_UI_SYSTEM.md` §10.5: con `prefers-reduced-motion` el salto es
 * instantáneo. El contenido nunca depende del movimiento para entenderse.
 */
export function scrollBehavior(prefersReducedMotion) {
  return prefersReducedMotion ? 'auto' : 'smooth';
}
