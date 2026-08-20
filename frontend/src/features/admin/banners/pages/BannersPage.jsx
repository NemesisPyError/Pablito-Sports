import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { Pagination } from '../../../../shared/components/Pagination.jsx';
import { BannersTable } from '../components/BannersTable.jsx';
import { useDeleteBanner } from '../hooks/useDeleteBanner.js';
import { useBanners } from '../hooks/useBanners.js';

/**
 * Listado de banners (07_PANEL_ADMIN.md §14.6, 05_API.md §9.11).
 *
 * La paginación es del servidor: §9.11 pagina de verdad, así que se navega por
 * páginas reales y los totales salen de `meta`, sin recortar en el cliente.
 *
 * §9.11 no define filtros y no se inventan: filtrar por estado sobre una sola
 * página mostraría un recuento que no es el del conjunto.
 */
export function BannersPage() {
  const navigate = useNavigate();
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, isError, isPlaceholderData, refetch } = useBanners(pagina);
  const eliminar = useDeleteBanner();

  const [aEliminar, setAEliminar] = useState(null);
  const [errorAccion, setErrorAccion] = useState(false);

  const banners = data?.items ?? [];
  const total = data?.meta?.total ?? banners.length;
  const totalPaginas = data?.meta?.total_pages ?? 1;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar los banners"
        message="Revisá tu conexión e intentá de nuevo."
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h5 mb-0">
          Banners
          <span className="text-muted fw-normal ms-2 small">({total})</span>
        </h2>
        <Link to="/admin/banners/new" className="btn btn-primary btn-sm">
          Nuevo banner
        </Link>
      </div>

      {errorAccion && (
        <div className="alert alert-danger py-2 small" role="alert">
          No pudimos eliminar el banner. Intentá de nuevo.
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Cargando banners…" />
      ) : banners.length === 0 ? (
        <EmptyState
          title="Todavía no hay banners"
          message="Creá el primero para destacar una pieza en la portada de la tienda."
          actionLabel="Nuevo banner"
          onAction={() => navigate('/admin/banners/new')}
        />
      ) : (
        <>
          {/* Atenúa la tabla mientras llega la página siguiente, en lugar de
              vaciarla: el salto a blanco desorienta más que la espera. */}
          <div className={isPlaceholderData ? 'opacity-50' : ''} aria-busy={isPlaceholderData}>
            <BannersTable banners={banners} busyId={eliminar.variables} onDelete={setAEliminar} />
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
        title="Eliminar banner"
        message={
          aEliminar ? `"${aEliminar.title}" dejará de mostrarse en la portada de la tienda.` : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={() => {
          setErrorAccion(false);
          eliminar.mutate(aEliminar.id, {
            // Si era el único de una página que no es la primera, esa página
            // deja de existir: hay que retroceder o se vería vacía.
            onSuccess: () => {
              if (banners.length === 1 && pagina > 1) setPagina(pagina - 1);
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
