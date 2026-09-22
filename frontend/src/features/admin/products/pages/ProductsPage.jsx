import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { Pagination } from '../../../../shared/components/Pagination.jsx';
import { ManualSaleDialog } from '../components/ManualSaleDialog.jsx';
import { ProductsFilters } from '../components/ProductsFilters.jsx';
import { ProductsTable } from '../components/ProductsTable.jsx';
import { useAdminProductFilters, useAdminProducts } from '../hooks/useAdminProducts.js';
import {
  useDeleteProduct,
  useFilterOptions,
  useSetProductActive,
  useSetProductHomeNew,
} from '../hooks/useProductActions.js';

/**
 * Listado de productos del panel (07_PANEL_ADMIN.md §14.2, 05_API.md §9.3).
 *
 * `PADP-02`: la eliminación es un borrado lógico (`AD-18`); el panel no
 * muestra ni restaura los productos eliminados.
 *
 * El alta y la edición no están disponibles: el backend exige `sku` y
 * `size_type_id`, y no hay endpoint que entregue los identificadores de sexo ni
 * de tipo de talle (§7.10, §7.11 los declaran datos semilla no administrables).
 */
export function ProductsPage() {
  const { filters, setFilters, reset, hasActiveFilters } = useAdminProductFilters();
  const { data, isLoading, isError, error, isFetching, refetch } = useAdminProducts(filters);
  const options = useFilterOptions();

  const setActive = useSetProductActive();
  const setHomeNew = useSetProductHomeNew();
  const eliminar = useDeleteProduct();

  const [confirmacion, setConfirmacion] = useState(null);
  const [ventaAbierta, setVentaAbierta] = useState(false);
  const [errorAccion, setErrorAccion] = useState(null);

  const productos = data?.items ?? [];
  const meta = data?.meta ?? {};
  const enCurso =
    setActive.variables?.productId ??
    setHomeNew.variables?.productId ??
    eliminar.variables;

  function ejecutar(mutacion, argumento) {
    setErrorAccion(null);
    mutacion.mutate(argumento, {
      onError: (error) => setErrorAccion(error),
      onSettled: () => setConfirmacion(null),
    });
  }

  function pedirEliminar(producto) {
    setConfirmacion({
      title: 'Eliminar producto',
      message: `"${producto.name}" se eliminará del catálogo. Esta acción no se puede deshacer desde el panel.`,
      confirmLabel: 'Eliminar',
      variant: 'danger',
      onConfirm: () => ejecutar(eliminar, producto.id),
    });
  }

  function pedirOcultar(producto) {
    // Activar es reversible e inmediato: 07 §11 no exige confirmación para eso.
    if (!producto.is_active) {
      ejecutar(setActive, { productId: producto.id, isActive: true });
      return;
    }
    setConfirmacion({
      title: 'Ocultar producto',
      message: `"${producto.name}" dejará de aparecer en el catálogo público.`,
      confirmLabel: 'Ocultar',
      variant: 'primary',
      onConfirm: () => ejecutar(setActive, { productId: producto.id, isActive: false }),
    });
  }

  // Reversible e inmediato, mismo criterio que activar: no interrumpe nada
  // en el catálogo público, así que no pide confirmación.
  function alternarNovedades(producto) {
    ejecutar(setHomeNew, {
      productId: producto.id,
      selected: producto.home_new_position == null,
    });
  }

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar los productos"
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
          Productos
          {meta.total !== undefined && (
            <span className="text-muted fw-normal ms-2 small">({meta.total})</span>
          )}
        </h2>
        <div className="d-flex align-items-center gap-2">
          {isFetching && !isLoading && (
            <span className="small text-muted" role="status">
              Actualizando…
            </span>
          )}
          {/* §9.19: la venta manual vive acá y no dentro de la ficha porque
              una venta puede tocar varios productos. La de una sola variante
              sigue estando en la ficha, sin cambios. */}
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => setVentaAbierta(true)}
          >
            Registrar venta
          </button>
          <Link to="/admin/products/new" className="btn btn-primary btn-sm">
            Nuevo producto
          </Link>
        </div>
      </div>

      <ProductsFilters
        filters={filters}
        options={options}
        onChange={setFilters}
        onReset={reset}
        hasActiveFilters={hasActiveFilters}
      />

      {errorAccion && (
        <div className="alert alert-danger py-2 small" role="alert">
          No pudimos completar la acción. Intentá de nuevo.
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Cargando productos…" />
      ) : productos.length === 0 ? (
        <EmptyState
          title="No hay productos que coincidan"
          message={
            hasActiveFilters
              ? 'Probá con otros criterios de búsqueda.'
              : 'Todavía no se cargó ningún producto.'
          }
          actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
          onAction={hasActiveFilters ? reset : undefined}
        />
      ) : (
        <>
          <ProductsTable
            products={productos}
            busyId={enCurso}
            onToggleActive={pedirOcultar}
            onToggleHomeNew={alternarNovedades}
            onDelete={pedirEliminar}
          />
          <Pagination
            page={meta.page ?? 1}
            totalPages={meta.total_pages ?? 1}
            total={meta.total ?? productos.length}
            onPageChange={(pagina) => setFilters({ page: pagina })}
          />
        </>
      )}

      <ManualSaleDialog isOpen={ventaAbierta} onClose={() => setVentaAbierta(false)} />

      <ConfirmDialog
        isOpen={Boolean(confirmacion)}
        title={confirmacion?.title ?? ''}
        message={confirmacion?.message ?? ''}
        confirmLabel={confirmacion?.confirmLabel}
        variant={confirmacion?.variant}
        busy={setActive.isPending || eliminar.isPending}
        onConfirm={() => confirmacion?.onConfirm()}
        onCancel={() => setConfirmacion(null)}
      />
    </>
  );
}
