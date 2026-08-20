import styles from './Tag.module.css';

const VARIANT_CLASS = {
  ink: styles.ink,
  accent: styles.accent,
};

/**
 * Distintivo corto de catálogo (09_COMPONENTES.md §9.3 `Tag`).
 *
 * Solo dos variantes a propósito: tinta para lo informativo y acento para lo
 * comercial. Los colores de estado no se usan acá porque están calculados para
 * llevar texto blanco, y como fondo de un texto en tinta no alcanzan el
 * contraste mínimo.
 */
export function Tag({ children, variant = 'ink', className = '' }) {
  return (
    <span className={`${styles.tag} ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.ink} ${className}`}>
      {children}
    </span>
  );
}
