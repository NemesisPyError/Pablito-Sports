import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { PromotionForm } from '../components/PromotionForm.jsx';
import { usePromotion, useSavePromotion } from '../hooks/usePromotions.js';

/**
 * Alta y edición de promociones (05_API.md §9.10, 07_PANEL_ADMIN.md §14.5).
 *
 * Una sola pantalla para ambas: §10.9 define un único juego de campos para
 * `PromotionCreateDTO` y `PromotionUpdateDTO`, y `PUT` reemplaza el recurso
 * completo, de modo que el formulario es el mismo.
 */
export function PromotionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const esEdicion = Boolean(id);
  const promotionId = esEdicion ? Number.parseInt(id, 10) : null;

  const { data: promocion, isLoading, isError, refetch } = usePromotion(promotionId);
  const guardar = useSavePromotion();

  if (esEdicion && isLoading) return <LoadingState message="Cargando promoción…" />;

  if (esEdicion && isError) {
    return (
      <ErrorState
        title="No pudimos cargar la promoción"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={refetch}
      />
    );
  }

  function enviar(payload) {
    guardar.mutate({ promotionId, payload }, { onSuccess: () => navigate('/admin/promotions') });
  }

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/admin/promotions">Promociones</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esEdicion ? promocion?.name : 'Nueva'}
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">{esEdicion ? 'Editar promoción' : 'Nueva promoción'}</h2>

      <div className="card">
        <div className="card-body">
          <PromotionForm
            // Remonta el formulario al llegar los datos, para que su estado
            // inicial salga del DTO y no de un objeto vacío.
            key={promocion?.id ?? 'nueva'}
            promotion={esEdicion ? promocion : null}
            onSubmit={enviar}
            onCancel={() => navigate('/admin/promotions')}
            saving={guardar.isPending}
            submitError={guardar.error}
          />
        </div>
      </div>

      <p className="form-text mt-3">
        Pueden convivir varias promociones vigentes sobre la misma entidad. Cuando eso ocurre, el
        catálogo aplica la de mayor descuento.
      </p>
    </>
  );
}
