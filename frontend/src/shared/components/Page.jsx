import { Breadcrumbs } from './Breadcrumbs.jsx';
import styles from './Page.module.css';

/**
 * Envoltura de las pantallas internas (08_UI_SYSTEM.md §7.1).
 *
 * Aporta contenedor, ritmo vertical, migas y encabezado. El título es el `h1`
 * de la pantalla: a diferencia de la portada, acá el encabezado **es** el
 * contenido principal y no hay razón para ocultarlo (§10.6).
 *
 * `narrow` acota la medida en las pantallas de lectura —«Nosotros»,
 * «Contacto»—, donde una columna a 1440 px sería ilegible.
 */
export function Page({
  title,
  eyebrow,
  lead,
  breadcrumbs,
  narrow = false,
  actions,
  children,
  className = '',
}) {
  return (
    <div
      className={[styles.page, narrow ? styles.narrow : '', className].filter(Boolean).join(' ')}
    >
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className={styles.breadcrumbs} />}

      {(title || actions) && (
        <div className={styles.header}>
          {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
          {title && <h1 className={styles.title}>{title}</h1>}
          {lead && <p className={styles.lead}>{lead}</p>}
          {actions}
        </div>
      )}

      {children}
    </div>
  );
}
