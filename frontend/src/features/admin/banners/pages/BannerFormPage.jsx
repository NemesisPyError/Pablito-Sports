import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { BannerForm } from '../components/BannerForm.jsx';
import { useBanner } from '../hooks/useBanner.js';
import { useSaveBanner } from '../hooks/useSaveBanner.js';

/**
 * Alta y edición de banners (05_API.md §9.11, 07_PANEL_ADMIN.md §14.6).
 *
 * Una sola pantalla para ambas: §10.13 define un único juego de campos para
 * `BannerCreateDTO` y `BannerUpdateDTO`, y `PUT` reemplaza el recurso completo,
 * de modo que el formulario es el mismo. La única diferencia es la imagen, que
 * al editar puede omitirse para conservar la actual.
 */
export function BannerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const esEdicion = Boolean(id);
  const bannerId = esEdicion ? Number.parseInt(id, 10) : null;

  const { data: banner, isLoading, isError, refetch } = useBanner(bannerId);
  const guardar = useSaveBanner();

  if (esEdicion && isLoading) return <LoadingState message="Cargando banner…" />;

  if (esEdicion && isError) {
    return (
      <ErrorState
        title="No pudimos cargar el banner"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={refetch}
      />
    );
  }

  function enviar(formData) {
    guardar.mutate({ bannerId, formData }, { onSuccess: () => navigate('/admin/banners') });
  }

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/admin/banners">Banners</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esEdicion ? banner?.title : 'Nuevo'}
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">{esEdicion ? 'Editar banner' : 'Nuevo banner'}</h2>

      <div className="card">
        <div className="card-body">
          <BannerForm
            // Remonta el formulario al llegar los datos, para que su estado
            // inicial salga del DTO y no de un objeto vacío.
            key={banner?.id ?? 'nuevo'}
            banner={esEdicion ? banner : null}
            onSubmit={enviar}
            onCancel={() => navigate('/admin/banners')}
            saving={guardar.isPending}
            submitError={guardar.error}
          />
        </div>
      </div>

      <p className="form-text mt-3">
        Los banners se ordenan por posición. Pueden compartirla: cuando eso ocurre, desempata el
        orden de creación.
      </p>
    </>
  );
}
