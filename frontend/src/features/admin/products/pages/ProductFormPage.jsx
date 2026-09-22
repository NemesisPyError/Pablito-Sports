import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { ProductForm } from '../components/ProductForm.jsx';
import { useClassificationOptions } from '../hooks/useClassificationOptions.js';
import { useAdminProduct, useSaveProduct } from '../hooks/useProductActions.js';

/**
 * Alta y edición de productos (05_API.md §9.3, 07_PANEL_ADMIN.md §14.3).
 *
 * Un solo formulario para los dos modos (v2.9.2, pedido explícito del
 * usuario): antes había un formulario reducido para crear
 * (`QuickAddProductForm`, retirado) y otro completo para editar. `ProductForm`
 * ahora cubre ambos — la única diferencia es si recibe `product` o no.
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

  // `ProductForm` es quien sabe si la petición fue alta o edición: acá solo
  // se envía el payload de `_product_fields`, reconciliar cantidades e
  // imágenes es cosa suya.
  function enviarGuardado(payload, { onSuccess }) {
    guardar.mutate({ productId, payload }, { onSuccess });
  }

  // Al editar se vuelve al detalle, que es donde vive la gestión operativa
  // de variantes (vender, eliminar). Al crear no se navega — el propio
  // `ProductForm` ya limpió el formulario para el siguiente producto (pedido
  // del administrador, 2026-08-16).
  function alGuardar(_guardado, { isCreate }) {
    if (!isCreate) navigate(`/admin/products/${productId}`);
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

      <ProductForm
        product={esEdicion ? producto.data : null}
        opciones={clasificaciones.opciones}
        onSubmit={enviarGuardado}
        onSaved={alGuardar}
        onCancel={() => navigate(esEdicion ? `/admin/products/${productId}` : '/admin/products')}
        saving={guardar.isPending}
        submitError={guardar.error}
      />
    </>
  );
}
