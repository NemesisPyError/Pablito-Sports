import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { BrandMediaSection } from '../components/BrandMediaSection.jsx';
import { ClassificationForm } from '../components/ClassificationForm.jsx';
import { getClassification } from '../config.js';
import {
  useClassification,
  useClassifications,
  useSaveClassification,
} from '../hooks/useClassifications.js';
import { useSeedData } from '../hooks/useSeedData.js';

/**
 * Alta y edición de una clasificación (05_API.md §9.5 a §9.9).
 *
 * Una sola pantalla para las cinco y para ambos modos: §10.13 define un único
 * juego de campos y `PUT` reemplaza el recurso completo.
 */
export function ClassificationFormPage({ recurso }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const config = getClassification(recurso);

  const esEdicion = Boolean(id) && id !== 'new';
  const entidadId = esEdicion ? Number.parseInt(id, 10) : null;

  const entidad = useClassification(recurso, entidadId);
  const guardar = useSaveClassification(recurso);

  // Sólo lo que el recurso necesita: categorías para elegir padre, tipos de
  // talle para los talles. Pedir todo siempre serían dos peticiones de más.
  const categorias = useClassifications(config?.campoExtra === 'parent' ? 'categories' : null);
  const semilla = useSeedData(config?.campoExtra === 'sizeType');

  if (!config) {
    return <ErrorState title="Sección desconocida" message="Esa clasificación no existe." />;
  }

  const cargando =
    (esEdicion && entidad.isLoading) ||
    (config.campoExtra === 'parent' && categorias.isLoading) ||
    (config.campoExtra === 'sizeType' && semilla.isLoading);

  if (cargando) return <LoadingState message="Cargando formulario…" />;

  if (esEdicion && entidad.isError) {
    return (
      <ErrorState
        title="No pudimos cargar el registro"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={entidad.refetch}
      />
    );
  }

  function enviar(payload) {
    guardar.mutate(
      { id: entidadId, payload },
      { onSuccess: () => navigate(`/admin/${config.ruta}`) },
    );
  }

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to={`/admin/${config.ruta}`}>{config.etiqueta}</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esEdicion ? entidad.data?.name : 'Nuevo'}
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">
        {esEdicion ? 'Editar' : `${config.articulo === 'la' ? 'Nueva' : 'Nuevo'}`}{' '}
        {config.singular.toLowerCase()}
      </h2>

      <div className="card">
        <div className="card-body">
          <ClassificationForm
            // Remonta al llegar los datos, para que el estado inicial salga del DTO.
            key={entidad.data?.id ?? 'nuevo'}
            entidad={esEdicion ? entidad.data : null}
            config={config}
            categorias={categorias.data?.items}
            tiposDeTalle={semilla.sizeTypes}
            onSubmit={enviar}
            onCancel={() => navigate(`/admin/${config.ruta}`)}
            saving={guardar.isPending}
            submitError={guardar.error}
          />
        </div>
      </div>

      {/* Las imágenes solo existen al editar: una marca sin crear no tiene
          dónde colgarlas, y subirlas antes dejaría archivos sin fila si el alta
          se cancela (`AD-39`). */}
      {config.esPiezaDePortada && esEdicion && entidad.data && (
        <BrandMediaSection brandId={entidad.data.id} logoUrl={entidad.data.image_url} />
      )}
    </>
  );
}
