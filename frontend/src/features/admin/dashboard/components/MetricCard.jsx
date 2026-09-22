import { AdminIcon } from '../../layout/AdminIcon.jsx';
import styles from './MetricCard.module.css';

const TONE_CLASS = {
  neutral: styles.toneNeutral,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  danger: styles.toneDanger,
  accent: styles.toneAccent,
};

/**
 * Tarjeta de métrica del dashboard (07_PANEL_ADMIN.md §14.1).
 *
 * §14.1: *"Las tarjetas son el componente principal del dashboard"*, y no hay
 * gráficos en v1 (`PADP-01`).
 *
 * Solo presenta: recibe el número ya calculado y no lo transforma.
 *
 * v2.9.11 (rediseño visual, pedido explícito del usuario, sobre referencia):
 * mismas siete tarjetas, mismos datos — ícono en una caja de color según
 * `tone`, etiqueta y número más grandes. El color es únicamente apoyo
 * visual (`08_UI_SYSTEM.md`): no reemplaza el texto, que sigue siendo lo que
 * el lector de pantalla anuncia.
 */
export function MetricCard({ label, value, tone = 'neutral', icon, emphasis = false }) {
  return (
    <div className={`${styles.card} ${TONE_CLASS[tone] ?? styles.toneNeutral} ${emphasis ? styles.cardEmphasis : ''}`}>
      {icon && (
        <span className={styles.iconBox}>
          <AdminIcon name={icon} size={20} />
        </span>
      )}
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
    </div>
  );
}

/** Esqueleto con la misma altura que la tarjeta, para que el layout no salte. */
export function MetricCardSkeleton() {
  return (
    <div className={`${styles.card} ${styles.toneNeutral}`} aria-hidden="true">
      <span className={`${styles.iconBox} placeholder-glow`}>
        <span className="placeholder w-100 h-100 rounded" />
      </span>
      <p className="placeholder-glow mb-1">
        <span className="placeholder col-7" />
      </p>
      <p className="placeholder-glow mb-0">
        <span className={`placeholder col-5 ${styles.valuePlaceholder}`} />
      </p>
    </div>
  );
}
