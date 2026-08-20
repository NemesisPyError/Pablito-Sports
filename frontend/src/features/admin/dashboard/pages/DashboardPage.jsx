import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { IncompleteProductsCard } from '../components/IncompleteProductsCard.jsx';
import { MetricCard, MetricCardSkeleton } from '../components/MetricCard.jsx';
import { RecentPriceChangesCard } from '../components/RecentPriceChangesCard.jsx';
import { buildMetricCards, useDashboard } from '../hooks/useDashboard.js';

/**
 * Dashboard del panel (07_PANEL_ADMIN.md §14.1, 05_API.md §9.2).
 *
 * §14.1: *"Ofrecer una vista rápida del estado del catálogo y destacar
 * productos que requieren atención."* Tarjetas de totales (`RF-38`) y alertas
 * de productos incompletos (`RF-39`). Sin gráficos en v1 (`PADP-01`).
 */
export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard();

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar el dashboard"
        message="Revisá tu conexión e intentá de nuevo."
        onRetry={refetch}
      />
    );
  }

  const metricas = buildMetricCards(data?.totals);

  return (
    <>
      <section aria-label="Totales del catálogo" className="mb-4">
        <div className="row g-3 row-cols-2 row-cols-md-3 row-cols-xl-4">
          {isLoading
            ? // Ocho esqueletos: los mismos que habrá después, para que la
              // pantalla no cambie de forma al llegar los datos.
              Array.from({ length: 8 }, (_, indice) => (
                <div className="col" key={indice}>
                  <MetricCardSkeleton />
                </div>
              ))
            : metricas.map((metrica) => (
                <div className="col" key={metrica.key}>
                  <MetricCard
                    label={metrica.label}
                    value={metrica.value}
                    tone={metrica.tone}
                    emphasis={metrica.emphasis}
                  />
                </div>
              ))}
        </div>
      </section>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          {isLoading ? (
            <CardSkeleton title="Productos incompletos" />
          ) : (
            <IncompleteProductsCard products={data?.incomplete_products} />
          )}
        </div>
        <div className="col-12 col-xl-6">
          {isLoading ? (
            <CardSkeleton title="Cambios de precio recientes" />
          ) : (
            <RecentPriceChangesCard changes={data?.recent_price_changes} />
          )}
        </div>
      </div>
    </>
  );
}

function CardSkeleton({ title }) {
  return (
    <section className="card h-100" aria-hidden="true">
      <div className="card-header bg-white">
        <h2 className="h6 mb-0">{title}</h2>
      </div>
      <ul className="list-group list-group-flush">
        {Array.from({ length: 3 }, (_, indice) => (
          <li className="list-group-item placeholder-glow" key={indice}>
            <span className="placeholder col-6 d-block mb-2" />
            <span className="placeholder col-4 d-block" />
          </li>
        ))}
      </ul>
    </section>
  );
}
