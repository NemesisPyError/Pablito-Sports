import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { BankForm } from '../components/BankForm.jsx';
import { useBank } from '../hooks/useBank.js';
import { useSaveBank } from '../hooks/useSaveBank.js';

/**
 * Alta y edición de bancos, mismo criterio que `BannerFormPage`: una sola
 * pantalla para ambas, `PUT` reemplaza el recurso completo.
 */
export function BankFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const esEdicion = Boolean(id);
  const bankId = esEdicion ? Number.parseInt(id, 10) : null;

  const { data: bank, isLoading, isError, refetch } = useBank(bankId);
  const guardar = useSaveBank();

  if (esEdicion && isLoading) return <LoadingState message="Cargando banco…" />;

  if (esEdicion && isError) {
    return (
      <ErrorState
        title="No pudimos cargar el banco"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={refetch}
      />
    );
  }

  function enviar(formData) {
    guardar.mutate({ bankId, formData }, { onSuccess: () => navigate('/admin/banks') });
  }

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/admin/banks">Bancos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esEdicion ? bank?.name : 'Nuevo'}
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">{esEdicion ? 'Editar banco' : 'Nuevo banco'}</h2>

      <div className="card">
        <div className="card-body">
          <BankForm
            key={bank?.id ?? 'nuevo'}
            bank={esEdicion ? bank : null}
            onSubmit={enviar}
            onCancel={() => navigate('/admin/banks')}
            saving={guardar.isPending}
            submitError={guardar.error}
          />
        </div>
      </div>

      <p className="form-text mt-3">
        Los bancos se ordenan por posición en la sección Superdescuentos. Pueden compartirla:
        cuando eso ocurre, desempata el orden de creación.
      </p>
    </>
  );
}
