import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { describeMissing } from '../hooks/useDashboard.js';

/**
 * Alertas de productos incompletos (`RF-39`, 07_PANEL_ADMIN.md §14.1).
 *
 * §14.1 la clasifica como *alerta*: productos sin imagen, sin precio o sin
 * categoría. Se listan tal como llegan en `incomplete_products` (§10.8), sin
 * reordenar ni filtrar.
 */
export function IncompleteProductsCard({ products }) {
  const items = products ?? [];

  return (
    <section className="card h-100">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <h2 className="h6 mb-0">Productos incompletos</h2>
        {items.length > 0 && (
          <span className="badge text-bg-warning rounded-pill">{items.length}</span>
        )}
      </div>

      <div className="card-body p-0">
        {items.length === 0 ? (
          <EmptyState title="Todo en orden" message="Ningún producto tiene datos pendientes." />
        ) : (
          <ul className="list-group list-group-flush">
            {items.map((producto) => (
              <li key={producto.id} className="list-group-item">
                <p className="mb-1 fw-semibold text-truncate">{producto.name}</p>
                <p className="mb-2 small text-muted text-truncate">{producto.slug}</p>
                <div className="d-flex flex-wrap gap-1">
                  {describeMissing(producto.missing).map((falta) => (
                    <span key={falta} className="badge text-bg-light border">
                      {falta}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
