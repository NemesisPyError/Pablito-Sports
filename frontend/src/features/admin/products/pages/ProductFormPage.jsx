import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { ProductForm } from '../components/ProductForm.jsx';
import { QuickAddProductForm } from '../components/QuickAddProductForm.jsx';
import { useClassificationOptions } from '../hooks/useClassificationOptions.js';
import { useAdminProduct, useSaveProduct } from '../hooks/useProductActions.js';

/**
 * Alta y edición de productos (05_API.md §9.3, 07_PANEL_ADMIN.md §14.3).
 *
 * Una sola pantalla para ambas: §10.4 define un único juego de campos y `PUT`
 * reemplaza el recurso completo.
 *
 * El formulario no se monta hasta tener las opciones: sin marcas, categorías,
 * sexos y tipos de talle no se puede componer un payload válido, y montar
 * selectores vacíos invitaría a guardar algo incompleto.
 */
export function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const esEdicion = Boolean(id);
  const productId = esEdicion ? Number.parseInt(id, 10) : null;

  const producto = useAdminProduct(productId);
  const clasificaciones = useClassificationOptions();
  const guardar = useSaveProduct();

  const cargando = clasificaciones.isLoading || (esEdicion && producto.isLoading);

  if (cargando) return <LoadingState message="Cargando formulario…" />;

  if (clasificaciones.isError) {
    return (
      <ErrorState
        title="No pudimos cargar las opciones"
        message="Sin marcas, categorías, sexos y tipos de talle no se puede crear un producto."
        onRetry={clasificaciones.refetch}
      />
    );
  }

  if (esEdicion && producto.isError) {
    return (
      <ErrorState
        title="No pudimos cargar el producto"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={producto.refetch}
      />
    );
  }

  function enviarEdicion(payload) {
    guardar.mutate(
      { productId, payload },
      {
        onSuccess: (guardado) => {
          // Al editar se vuelve al detalle, que es donde se cargan las
          // imágenes.
          navigate(`/admin/products/${guardado?.id ?? productId}`);
        },
      },
    );
  }

  // El alta rápida no navega al guardar: `QuickAddProductForm` limpia sus
  // propios campos y queda lista para el siguiente producto (pedido del
  // administrador, 2026-08-16). Se le pasa el producto creado (no solo un
  // aviso de éxito) porque desde 2026-08-19 el propio formulario sube ahí
  // mismo las imágenes elegidas, contra el `id` recién asignado.
  function enviarAlta(payload, { onSuccess }) {
    guardar.mutate(
      { productId: null, payload },
      { onSuccess: (creado) => onSuccess(creado) },
    );
  }

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/admin/products">Productos</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esEdicion ? producto.data?.name : 'Nuevo'}
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">{esEdicion ? 'Editar producto' : 'Nuevo producto'}</h2>

      {esEdicion ? (
        <ProductForm
          product={producto.data}
          opciones={clasificaciones.opciones}
          onSubmit={enviarEdicion}
          onCancel={() => navigate(`/admin/products/${productId}`)}
          saving={guardar.isPending}
          submitError={guardar.error}
        />
      ) : (
        <QuickAddProductForm
          opciones={clasificaciones.opciones}
          onSubmit={enviarAlta}
          saving={guardar.isPending}
          submitError={guardar.error}
        />
      )}
    </>
  );
}
