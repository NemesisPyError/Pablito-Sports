import { AVAILABILITY_LABELS } from '../utils/stock.js';
import styles from './AvailabilityBadge.module.css';

// RN-38b (v1.4.0): 3 estados derivados de la cantidad, se retira "coming_soon".
const AVAILABILITY_CONFIG = {
  available: { label: AVAILABILITY_LABELS.available, className: styles.available },
  low_stock: { label: AVAILABILITY_LABELS.low_stock, className: styles.lowStock },
  out_of_stock: { label: AVAILABILITY_LABELS.out_of_stock, className: styles.outOfStock },
};

/**
 * Traduce el estado de disponibilidad a una etiqueta visual.
 *
 * Un valor desconocido se muestra tal cual con el tono neutro: el catálogo
 * público no es el lugar para ocultar un dato que el backend considera válido.
 */
export function AvailabilityBadge({ availability }) {
  const config = AVAILABILITY_CONFIG[availability] ?? {
    label: availability,
    className: styles.outOfStock,
  };

  return (
    <span className={`${styles.badge} ${config.className}`}>
      <span className={styles.dot} aria-hidden="true" />
      {config.label}
    </span>
  );
}
