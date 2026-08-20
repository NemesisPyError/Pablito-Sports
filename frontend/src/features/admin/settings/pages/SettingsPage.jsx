import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { StoreSettingsForm } from '../components/StoreSettingsForm.jsx';
import { useSaveStoreSettings } from '../hooks/useSaveStoreSettings.js';
import { useStoreSettings } from '../hooks/useStoreSettings.js';

/**
 * Configuración de la tienda (05_API.md §9.12, 07_PANEL_ADMIN.md §14.7).
 *
 * Recurso único: no hay listado ni alta. La pantalla carga la configuración y
 * la guarda completa, porque el `PUT` reemplaza el recurso entero.
 */
export function SettingsPage() {
  const { data: configuracion, isLoading, isError, error, refetch } = useStoreSettings();
  const guardar = useSaveStoreSettings();

  if (isLoading) return <Esqueleto />;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar la configuración"
        message={
          // §9.12 responde 404 mientras la fila única no exista. Es un caso
          // distinto de un fallo de red y merece decirlo, porque reintentar no
          // lo resuelve.
          error?.status === 404
            ? 'La configuración de la tienda todavía no fue inicializada.'
            : 'Revisá tu conexión e intentá de nuevo.'
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      <h2 className="h5 mb-3">Configuración</h2>

      {/* No hace falta remontar por `key` como en Banners: el esqueleto de
          arriba garantiza que el formulario solo se monte con los datos ya
          cargados, y `initialValues` se recalcula si el DTO cambia. */}
      <StoreSettingsForm
        settings={configuracion}
        onSubmit={(payload) => guardar.mutate(payload)}
        saving={guardar.isPending}
        saved={guardar.isSuccess}
        submitError={guardar.error}
      />
    </>
  );
}

/** Esqueleto de carga: reserva el alto de las dos tarjetas del formulario. */
function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando configuración">
      <div className="placeholder-glow mb-3">
        <span className="placeholder col-3" />
      </div>

      {[6, 2].map((campos, indice) => (
        <div className="card mb-3" key={indice}>
          <div className="card-body placeholder-glow">
            {Array.from({ length: campos }, (_, fila) => (
              <div className="mb-3" key={fila}>
                <span className="placeholder col-4 mb-1 d-block" />
                <span className="placeholder col-12 d-block" style={{ height: '2.25rem' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
