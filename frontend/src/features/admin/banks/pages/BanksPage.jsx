import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { Pagination } from '../../../../shared/components/Pagination.jsx';
import { BanksTable } from '../components/BanksTable.jsx';
import { useDeleteBank } from '../hooks/useDeleteBank.js';
import { useBanks } from '../hooks/useBanks.js';

/**
 * Listado de bancos de Superdescuentos, mismo criterio que `BannersPage`:
 * paginación del servidor, sin filtros.
 */
export function BanksPage() {
  const navigate = useNavigate();
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, isError, error, isPlaceholderData, refetch } = useBanks(pagina);
  const eliminar = useDeleteBank();

  const [aEliminar, setAEliminar] = useState(null);
  const [errorAccion, setErrorAccion] = useState(false);

  const banks = data?.items ?? [];
  const total = data?.meta?.total ?? banks.length;
  const totalPaginas = data?.meta?.total_pages ?? 1;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar los bancos"
        message="Revisá tu conexión e intentá de nuevo."
        error={error}
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h5 mb-0">
          Bancos (Superdescuentos)
          <span className="text-muted fw-normal ms-2 small">({total})</span>
        </h2>
        <Link to="/admin/banks/new" className="btn btn-primary btn-sm">
          Nuevo banco
        </Link>
      </div>

      {errorAccion && (
        <div className="alert alert-danger py-2 small" role="alert">
          No pudimos eliminar el banco. Intentá de nuevo.
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Cargando bancos…" />
      ) : banks.length === 0 ? (
        <EmptyState
          title="Todavía no hay bancos"
          message="Creá el primero para mostrarlo en la sección Superdescuentos de la tienda."
          actionLabel="Nuevo banco"
          onAction={() => navigate('/admin/banks/new')}
        />
      ) : (
        <>
          <div className={isPlaceholderData ? 'opacity-50' : ''} aria-busy={isPlaceholderData}>
            <BanksTable banks={banks} busyId={eliminar.variables} onDelete={setAEliminar} />
          </div>
          <Pagination
            page={pagina}
            totalPages={totalPaginas}
            total={total}
            onPageChange={setPagina}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar banco"
        message={
          aEliminar ? `"${aEliminar.name}" dejará de mostrarse en Superdescuentos.` : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={() => {
          setErrorAccion(false);
          eliminar.mutate(aEliminar.id, {
            onSuccess: () => {
              if (banks.length === 1 && pagina > 1) setPagina(pagina - 1);
            },
            onError: () => setErrorAccion(true),
            onSettled: () => setAEliminar(null),
          });
        }}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
