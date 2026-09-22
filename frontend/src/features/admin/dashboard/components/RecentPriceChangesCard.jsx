import { AdminIcon } from '../../layout/AdminIcon.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { formatDateTime } from '../../../../shared/formatters/date.js';
import { formatGuaranies } from '../../../../shared/formatters/currency.js';
import styles from './DashboardPanel.module.css';

/**
 * Últimos cambios de precio (`RN-70`, 05_API.md §10.8 y §10.12).
 *
 * El backend los entrega ya ordenados del más reciente al más antiguo y
 * acotados; aquí solo se presentan. `PriceHistoryDTO` trae `old_price`,
 * `new_price`, el producto y quién lo hizo.
 */
export function RecentPriceChangesCard({ changes }) {
  const items = changes ?? [];

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelIcon}>
          <AdminIcon name="trendingUp" size={18} />
        </span>
        <h2 className={styles.panelTitle}>Cambios de precio recientes</h2>
      </div>

      <div className="card-body p-0">
        {items.length === 0 ? (
          <EmptyState
            title="Sin cambios recientes"
            message="Todavía no se registraron cambios de precio."
            icon={<AdminIcon name="trendingUp" size={24} />}
          />
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((cambio) => (
              <li key={cambio.id} className="list-group-item">
                <p className="mb-1 fw-semibold text-truncate">{cambio.product?.name}</p>
                <p className="mb-1 small">
                  <span className="text-muted text-decoration-line-through">
                    {formatGuaranies(cambio.old_price)}
                  </span>
                  <span aria-hidden="true" className="mx-2">
                    →
                  </span>
                  <span className={claseSegunDireccion(cambio)}>
                    {formatGuaranies(cambio.new_price)}
                  </span>
                </p>
                <p className="mb-0 small text-muted">
                  {formatDateTime(cambio.created_at)} · {cambio.administrator?.username}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/**
 * Color según suba o baje.
 *
 * No es una métrica nueva: es la misma pareja de valores que ya trae el DTO,
 * leída de un vistazo.
 */
function claseSegunDireccion(cambio) {
  if (cambio.new_price > cambio.old_price) return 'text-danger fw-semibold';
  if (cambio.new_price < cambio.old_price) return 'text-success fw-semibold';
  return 'fw-semibold';
}
