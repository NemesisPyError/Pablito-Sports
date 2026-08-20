/**
 * Tarjeta de métrica del dashboard (07_PANEL_ADMIN.md §14.1).
 *
 * §14.1: *"Las tarjetas son el componente principal del dashboard"*, y no hay
 * gráficos en v1 (`PADP-01`).
 *
 * Solo presenta: recibe el número ya calculado y no lo transforma.
 */
export function MetricCard({ label, value, tone = 'secondary', emphasis = false }) {
  return (
    <div className={`card h-100 ${emphasis ? 'border-primary' : ''}`}>
      <div className="card-body py-3">
        <p className="text-muted text-uppercase small mb-1">{label}</p>
        <p className={`h3 mb-0 text-${tone}`}>{value}</p>
      </div>
    </div>
  );
}

/** Esqueleto con la misma altura que la tarjeta, para que el layout no salte. */
export function MetricCardSkeleton() {
  return (
    <div className="card h-100" aria-hidden="true">
      <div className="card-body py-3">
        <p className="placeholder-glow mb-1">
          <span className="placeholder col-7" />
        </p>
        <p className="placeholder-glow h3 mb-0">
          <span className="placeholder col-4" />
        </p>
      </div>
    </div>
  );
}
