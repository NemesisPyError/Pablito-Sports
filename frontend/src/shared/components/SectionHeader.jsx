import { Link } from 'react-router-dom';

import styles from './SectionHeader.module.css';

/**
 * Encabezado de una sección de la portada (09_COMPONENTES.md §9.8).
 *
 * El `id` es obligatorio en la práctica: es lo que `Section` referencia con
 * `aria-labelledby` para que cada bloque de la Home se anuncie por su nombre
 * (`08_UI_SYSTEM.md` §10.6).
 *
 * `hint`: aviso opcional debajo del título, un símbolo + una frase corta
 * (p. ej. `ProductRail`/`NewArrivalsCarousel` lo usan para avisar, una sola
 * vez por carril y no por tarjeta, que sus fotos cambian al mantener
 * apretado o pasar el cursor). Puramente informativo — sin enlace, sin
 * `onClick`; `SectionHeader` no sabe de dónde sale el texto, solo lo pinta.
 */
export function SectionHeader({ id, eyebrow, title, href, hint, linkLabel = 'Ver todo' }) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {hint && (
          <p className={styles.hint}>
            {/* Símbolo decorativo: el aviso ya lo dice en texto, así que el
                lector de pantalla no necesita anunciarlo dos veces. Se pinta
                con `currentColor` (máscara, no `<img>`) para seguir el mismo
                tono que el resto del encabezado — claro en sección clara,
                inverso en sección de tinta (`--section-text-muted`) — sin
                necesitar una segunda versión del ícono. */}
            <span className={styles.hintIcon} aria-hidden="true" />
            {hint}
          </p>
        )}
      </div>

      {href && (
        <Link to={href} className={styles.link}>
          {/* El nombre accesible incluye la sección: fuera de contexto, una
              lista de enlaces «Ver todo» repetidos no dice nada. */}
          <span aria-hidden="true">{linkLabel}</span>
          <span className="visually-hidden">{`${linkLabel} de ${title}`}</span>
        </Link>
      )}
    </div>
  );
}
