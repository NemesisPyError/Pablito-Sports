import { Link } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { WhatsappTemplateForm } from '../components/WhatsappTemplateForm.jsx';
import { useResetWhatsappTemplate } from '../hooks/useResetWhatsappTemplate.js';
import { useSaveWhatsappTemplate } from '../hooks/useSaveWhatsappTemplate.js';
import { useWhatsappTemplate } from '../hooks/useWhatsappTemplate.js';
import { useStoreSettings } from '../../settings/hooks/useStoreSettings.js';

/**
 * Plantilla de WhatsApp (05_API.md §9.13, 07_PANEL_ADMIN.md §14.8, `RF-41`).
 *
 * Pantalla propia porque el mensaje que compone el catálogo depende de esto
 * tanto como de la configuración general, y §14.7 la excluye a propósito de
 * esa pantalla.
 */
export function WhatsappTemplatePage() {
  const { data: template, isLoading, isError, error, refetch } = useWhatsappTemplate();
  // Solo para el nombre de la tienda en la vista previa (`{{tienda}}`); no se edita acá.
  const { data: configuracion } = useStoreSettings();
  const guardar = useSaveWhatsappTemplate();
  const restaurar = useResetWhatsappTemplate();

  if (isLoading) return <Esqueleto />;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar la plantilla"
        message={
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
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/admin/settings">Configuración</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            Plantilla WhatsApp
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">Plantilla WhatsApp</h2>

      <WhatsappTemplateForm
        template={template}
        storeName={configuracion?.store_name}
        onSubmit={(payload) => guardar.mutate(payload)}
        // `mutateAsync` (no `mutate`): el formulario necesita la plantilla ya
        // restaurada para pisar lo que tenía escrito, no solo saber que
        // terminó.
        onReset={() => restaurar.mutateAsync()}
        saving={guardar.isPending}
        resetting={restaurar.isPending}
        saved={guardar.isSuccess || restaurar.isSuccess}
        submitError={guardar.error || restaurar.error}
      />
    </>
  );
}

function Esqueleto() {
  return (
    <div aria-busy="true" aria-label="Cargando plantilla">
      <div className="placeholder-glow mb-3">
        <span className="placeholder col-3" />
      </div>
      <div className="row g-3">
        {[0, 1].map((columna) => (
          <div className="col-12 col-xl-6" key={columna}>
            <div className="card mb-3">
              <div className="card-body placeholder-glow">
                <span className="placeholder col-4 mb-2 d-block" />
                <span className="placeholder col-12 d-block" style={{ height: '10rem' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
