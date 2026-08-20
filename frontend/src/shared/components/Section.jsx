import styles from './Section.module.css';

const TONE_CLASS = {
  default: styles.toneDefault,
  alt: styles.toneAlt,
  inverse: styles.toneInverse,
};

/**
 * Bloque vertical de la portada (09_COMPONENTES.md §9.8).
 *
 * Aporta el ritmo vertical y el contenedor de la tienda. La accesibilidad de
 * la Home depende de que cada sección se anuncie con su propio encabezado
 * (`08_UI_SYSTEM.md` §10.6): por eso `labelledBy` apunta al `id` del título
 * que renderiza `SectionHeader`.
 */
export function Section({
  children,
  tone = 'default',
  labelledBy,
  flush = false,
  wide = false,
  className = '',
}) {
  return (
    <section
      className={[
        styles.section,
        TONE_CLASS[tone] ?? TONE_CLASS.default,
        flush ? styles.flush : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby={labelledBy}
    >
      <div className={`${styles.container} ${wide ? styles.wide : ''}`}>{children}</div>
    </section>
  );
}
