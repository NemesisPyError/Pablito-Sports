import styles from './ScrollingMessage.module.css';

/**
 * Franja de mensaje deslizante bajo el hero (08_UI_SYSTEM.md §14.1).
 *
 * Es una banda editorial fija, no administrable: igual que `TrustBar`, dice
 * algo que no cambia por campaña. Por eso el texto vive acá y no en
 * `store_settings` — no hay endpoint, no hay panel y no hace falta ninguno.
 *
 * El movimiento es 100% CSS (`ScrollingMessage.module.css`): JavaScript solo
 * dibuja las copias. Una animación mantenida desde JS obligaría a un
 * `requestAnimationFrame` vivo en toda la portada para un adorno.
 */

export const SCROLLING_MESSAGE =
  '• Estilo, Comodidad y calidad en cada paso ' +
  '• Calzados, prendas y accesorios para cada momento';

/**
 * Copias de la frase en la fila.
 *
 * **Tiene que ser par.** La animación desplaza la fila un -50% exacto, así que
 * la segunda mitad tiene que ser idéntica a la primera: al terminar el ciclo,
 * la copia 5 está justo donde arrancó la 1 y el reinicio no se ve. Ocho
 * alcanzan para llenar una pantalla ancha con la frase completa; menos dejaría
 * hueco a la derecha en escritorio.
 */
const COPIES = 8;

export function ScrollingMessage() {
  return (
    <section className={styles.strip} aria-label="Mensaje de la tienda">
      {/* La frase se lee una sola vez. La fila de abajo es decorativa: son
          ocho repeticiones del mismo texto, y sin `aria-hidden` un lector de
          pantalla las anunciaría las ocho. */}
      <p className="visually-hidden">{SCROLLING_MESSAGE}</p>

      <div className={styles.track} aria-hidden="true">
        {Array.from({ length: COPIES }, (_, indice) => (
          // El índice como `key` es correcto acá: la lista es fija, del mismo
          // largo siempre y sin identidad propia por elemento.
          <span className={styles.phrase} key={indice}>
            {SCROLLING_MESSAGE}
          </span>
        ))}
      </div>
    </section>
  );
}
