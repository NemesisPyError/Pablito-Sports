import { Link } from 'react-router-dom';

import styles from './SectionHeader.module.css';

/**
 * Encabezado de una sección de la portada (09_COMPONENTES.md §9.8).
 *
 * El `id` es obligatorio en la práctica: es lo que `Section` referencia con
 * `aria-labelledby` para que cada bloque de la Home se anuncie por su nombre
 * (`08_UI_SYSTEM.md` §10.6).
 */
export function SectionHeader({ id, eyebrow, title, href, linkLabel = 'Ver todo' }) {
  return (
    <div className={styles.header}>
      <div className={styles.heading}>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
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
