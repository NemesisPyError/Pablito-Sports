import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { ClassificationsTable } from '../components/ClassificationsTable.jsx';
import { getClassification } from '../config.js';
import {
  useClassifications,
  useDeleteClassification,
  useRestoreClassification,
} from '../hooks/useClassifications.js';

/**
 * Listado de una clasificación (07_PANEL_ADMIN.md §14.4).
 *
 * Una sola pantalla para marcas, categorías, deportes y talles: §9.5 a §9.9
 * definen el mismo CRUD y el mismo contrato de salida. El recurso llega por
 * la ruta.
 */
export function ClassificationsPage({ recurso }) {
  const navigate = useNavigate();
  const config = getClassification(recurso);

  const { data, isLoading, isError, error, refetch } = useClassifications(recurso);
  // Las categorías se usan para resolver el nombre del padre en la tabla.
  const categorias = useClassifications(config?.campoExtra === 'parent' ? 'categories' : null);

  const eliminar = useDeleteClassification(recurso);
  const restaurar = useRestoreClassification(recurso);

  const [aEliminar, setAEliminar] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  if (!config) {
    return <ErrorState title="Sección desconocida" message="Esa clasificación no existe." />;
  }

  if (isError) {
    return (
      <ErrorState
        title={`No pudimos cargar ${config.etiqueta.toLowerCase()}`}
        message="Revisá tu conexión e intentá de nuevo."
        error={error}
        onRetry={refetch}
      />
    );
  }

  const items = data?.items ?? [];

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h5 mb-0">
          {config.etiqueta}
          <span className="text-muted fw-normal ms-2 small">({items.length})</span>
        </h2>
        <Link to={`/admin/${config.ruta}/new`} className="btn btn-primary btn-sm">
          {config.articulo === 'la' ? 'Nueva' : 'Nuevo'} {config.singular.toLowerCase()}
        </Link>
      </div>

      {errorAccion && (
        <div className="alert alert-danger py-2 small" role="alert">
          {errorAccion}
        </div>
      )}

      {isLoading ? (
        <LoadingState message={`Cargando ${config.etiqueta.toLowerCase()}…`} />
      ) : items.length === 0 ? (
        <EmptyState
          title={`Todavía no hay ${config.etiqueta.toLowerCase()}`}
          message="Creá la primera para poder asignarla a un producto."
          actionLabel={`${config.articulo === 'la' ? 'Nueva' : 'Nuevo'} ${config.singular.toLowerCase()}`}
          onAction={() => navigate(`/admin/${config.ruta}/new`)}
        />
      ) : (
        <ClassificationsTable
          items={items}
          config={config}
          categorias={categorias.data?.items}
          busyId={eliminar.variables ?? restaurar.variables}
          onDelete={setAEliminar}
          onRestore={(item) => {
            setErrorAccion(null);
            restaurar.mutate(item.id, {
              onError: () => setErrorAccion('No pudimos restaurar. Intentá de nuevo.'),
            });
          }}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title={`Eliminar ${config.singular.toLowerCase()}`}
        message={
          aEliminar
            ? `"${aEliminar.name}" dejará de estar disponible para nuevos productos. Podés restaurarla después.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={() => {
          setErrorAccion(null);
          eliminar.mutate(aEliminar.id, {
            onError: (error) => {
              // §9.5 a §9.9: `409` con `RN-68` cuando hay dependencias.
              setErrorAccion(
                error?.status === 409
                  ? `No se puede eliminar "${aEliminar.name}". ${config.bloqueoDeBorrado}`
                  : 'No pudimos eliminar. Intentá de nuevo.',
              );
            },
            onSettled: () => setAEliminar(null),
          });
        }}
        onCancel={() => setAEliminar(null)}
      />
    </>
  );
}
