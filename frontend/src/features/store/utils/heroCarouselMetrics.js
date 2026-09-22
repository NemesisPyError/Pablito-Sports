/**
 * Cálculos del carrusel de portada (09_COMPONENTES.md §9.8 `Hero`).
 *
 * Viven fuera del componente porque son la única parte con lógica real: el
 * resto es marcado y temporizadores de React. Aisladas, se pueden verificar
 * sin montar React ni simular temporizadores.
 */

/** Milisegundos entre avances automáticos. */
export const AUTOPLAY_INTERVAL_MS = 4500;

/**
 * Normaliza un índice fuera de rango a una posición válida del carrusel.
 *
 * Envuelve en ambos sentidos (negativo o mayor a `count - 1`) para que
 * "anterior" desde la primera pieza lleve a la última, y viceversa.
 */
export function wrapIndex(index, count) {
  if (count <= 0) return 0;
  return ((index % count) + count) % count;
}

/**
 * ¿Corresponde avanzar solo?
 *
 * No avanza con una sola pieza (no hay adónde ir), mientras el usuario
 * interactúa (hover, foco, toque) ni cuando el sistema pide menos
 * movimiento: quien activó `prefers-reduced-motion` no debe recibir una
 * rotación forzada, con o sin controles manuales disponibles.
 */
export function shouldAutoplay({ count, isPaused, prefersReducedMotion }) {
  return count > 1 && !isPaused && !prefersReducedMotion;
}
