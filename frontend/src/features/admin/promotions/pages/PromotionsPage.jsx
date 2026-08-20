import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { Pagination } from '../../../../shared/components/Pagination.jsx';
import { PromotionsTable } from '../components/PromotionsTable.jsx';
import {
  filterPromotions,
  STATUS_FILTER_OPTIONS,
  useDeletePromotion,
  usePromotions,
} from '../hooks/usePromotions.js';
import { SCOPE_LABELS, SCOPE_TYPES } from '../utils/promotionStatus.js';

const POR_PAGINA = 20;

/**
 * Listado de promociones (07_PANEL_ADMIN.md §14.5, 05_API.md §9.10).
 *
 * §9.10 define el listado **sin filtros**: solo `page` y `per_page`. Por eso el
 * filtrado por estado y alcance ocurre en el cliente, sobre el conjunto traído.
 * Si el total del servidor supera lo recibido, la pantalla lo advierte en lugar
 * de filtrar sobre datos incompletos sin decirlo.
 */
export function PromotionsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = usePromotions();
  const eliminar = useDeletePromotion();

  const [filtros, setFiltros] = useState({ status: '', scope: '' });
  const [pagina, setPagina] = useState(1);
  const [aEliminar, setAEliminar] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  // `?? []` crea un array nuevo en cada render; memorizarlo evita que el filtro
  // se recalcule sin que hayan cambiado ni los datos ni los criterios.
  const todas = useMemo(() => data?.items ?? [], [data]);
  const total = data?.meta?.total ?? todas.length;
  const hayMasEnElServidor = total > todas.length;

  const filtradas = useMemo(() => filterPromotions(todas, filtros), [todas, filtros]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  const hayFiltros = Boolean(filtros.status || filtros.scope);

  function cambiarFiltro(cambios) {
    setFiltros((previos) => ({ ...previos, ...cambios }));
    setPagina(1);
  }

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar las promociones"
        message="Revisá tu conexión e intentá de nuevo."
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h5 mb-0">
          Promociones
          <span className="text-muted fw-normal ms-2 small">({filtradas.length})</span>
        </h2>
        <Link to="/admin/promotions/new" className="btn btn-primary btn-sm">
          Nueva promoción
        </Link>
      </div>

      <section className="card mb-3" aria-label="Filtros">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-sm-6 col-lg-4">
              <label htmlFor="filtro-estado" className="form-label small mb-1">
                Estado
              </label>
              <select
                id="filtro-estado"
                className="form-select form-select-sm"
                value={filtros.status}
                onChange={(evento) => cambiarFiltro({ status: evento.target.value })}
              >
                <option value="">Todos</option>
                {STATUS_FILTER_OPTIONS.map((opcion) => (
                  <option key={opcion.value} value={opcion.value}>
                    {opcion.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-sm-6 col-lg-4">
              <label htmlFor="filtro-alcance" className="form-label small mb-1">
                Alcance
              </label>
              <select
                id="filtro-alcance"
                className="form-select form-select-sm"
                value={filtros.scope}
                onChange={(evento) => cambiarFiltro({ scope: evento.target.value })}
              >
                <option value="">Todos</option>
                {Object.values(SCOPE_TYPES).map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {SCOPE_LABELS[tipo]}
                  </option>
                ))}
              </select>
            </div>

            {hayFiltros && (
              <div className="col-12 col-lg-4 d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-link btn-sm"
                  onClick={() => cambiarFiltro({ status: '', scope: '' })}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {hayMasEnElServidor && (
        <div className="alert alert-warning py-2 small" role="alert">
          Se muestran las primeras {todas.length} de {total} promociones. El listado del servidor
          todavía no admite filtros, así que los de esta pantalla se aplican solo sobre las
          recibidas.
        </div>
      )}

      {errorAccion && (
        <div className="alert alert-danger py-2 small" role="alert">
          No pudimos eliminar la promoción. Intentá de nuevo.
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Cargando promociones…" />
      ) : visibles.length === 0 ? (
        <EmptyState
          title={hayFiltros ? 'No hay promociones que coincidan' : 'Todavía no hay promociones'}
          message={
            hayFiltros
              ? 'Probá con otros criterios.'
              : 'Creá la primera para aplicar un descuento a una marca, categoría o producto.'
          }
          actionLabel={hayFiltros ? 'Limpiar filtros' : 'Nueva promoción'}
          onAction={
            hayFiltros
              ? () => cambiarFiltro({ status: '', scope: '' })
              : () => navigate('/admin/promotions/new')
          }
        />
      ) : (
        <>
          <PromotionsTable
            promotions={visibles}
            busyId={eliminar.variables}
            onDelete={setAEliminar}
          />
          <Pagination
            page={paginaActual}
            totalPages={totalPaginas}
            total={filtradas.length}
            onPageChange={setPagina}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar promoción"
        message={
          aEliminar
            ? `"${aEliminar.name}" dejará de aplicarse. Los precios volverán a su valor sin descuento.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={() => {
          setErrorAccion(null);
          eliminar.mutate(aEliminar.id, {
            onError: (error) => setErrorAccion(error),
            onSettled: () => setAEliminar(null),
          });
        }}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
