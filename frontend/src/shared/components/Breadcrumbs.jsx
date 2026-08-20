import { Link } from 'react-router-dom';

import styles from './Breadcrumbs.module.css';

/**
 * Migas de pan visibles y semánticas, como píldoras (`08_UI_SYSTEM.md` §6.4).
 *
 * `<nav>` + `<ol>`: el orden importa, y los lectores de pantalla anuncian la
 * jerarquía. El último tramo no es enlace y lleva `aria-current="page"`, que es
 * lo que distingue "dónde estoy" de "a dónde puedo ir".
 *
 * **No** emite JSON-LD de `BreadcrumbList`: 06_FRONTEND.md §17.4 reserva los
 * datos estructurados a los endpoints `/_seo/*` del backend.
 *
 * @param items `[{ label, to }]`. El último se muestra como posición actual,
 *   tenga `to` o no.
 */
export function Breadcrumbs({ items, className = '' }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Migas de pan" className={className}>
      <ol className={`${styles.list} overflow-auto`}>
        {items.map((item, indice) => {
          const esUltimo = indice === items.length - 1;

          return (
            <li
              key={`${item.label}-${indice}`}
              className={`${styles.item} ${esUltimo ? styles.itemCurrent : ''}`}
              aria-current={esUltimo ? 'page' : undefined}
            >
              {esUltimo || !item.to ? (
                <span className={styles.current}>{item.label}</span>
              ) : (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
