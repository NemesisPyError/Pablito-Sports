import { Link, useParams } from 'react-router-dom';

import { translateGender, translateSizeType } from '../../../../shared/config/labels.js';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { formatDateTime } from '../../../../shared/formatters/date.js';
import { formatGuaranies } from '../../../../shared/formatters/currency.js';
import { ImagesSection } from '../components/ImagesSection.jsx';
import { VariantsSection } from '../components/VariantsSection.jsx';
import { AVAILABILITY_OPTIONS } from '../hooks/useAdminProducts.js';
import { useAdminProduct } from '../hooks/useProductActions.js';

/**
 * Ficha de producto en **solo lectura** (07_PANEL_ADMIN.md §14.3).
 *
 * La edición de los campos del producto no está disponible: `PUT` exige `sku` y
 * `size_type_id`, y ningún endpoint entrega los identificadores de sexo ni de
 * tipo de talle, que §7.10 y §7.11 declaran datos semilla no administrables.
 * Lo que sí se puede gestionar desde aquí son imágenes y variantes, que tienen
 * sus propios endpoints.
 */
export function ProductDetailPage() {
  const { id } = useParams();
  const productId = Number.parseInt(id ?? '', 10);
  const { data: producto, isLoading, isError, refetch } = useAdminProduct(productId);

  if (isLoading) return <LoadingState message="Cargando producto…" />;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar el producto"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={refetch}
      />
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
            {producto.name}
          </li>
        </ol>
      </nav>

      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div>
          <h2 className="h5 mb-1">{producto.name}</h2>
          <p className="small text-muted mb-0">{producto.sku}</p>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-1">
          <Link
            to={`/admin/products/${producto.id}/edit`}
            className="btn btn-outline-primary btn-sm me-2"
          >
            Editar
          </Link>
          {producto.deleted_at ? (
            <span className="badge text-bg-danger">Eliminado</span>
          ) : (
            <span className={`badge text-bg-${producto.is_active ? 'success' : 'secondary'}`}>
              {producto.is_active ? 'Activo' : 'Oculto'}
            </span>
          )}
          {producto.is_featured && <span className="badge text-bg-light border">Destacado</span>}
          {producto.is_new && <span className="badge text-bg-light border">Nuevo</span>}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-7">
          <section className="card mb-3">
            <div className="card-header bg-white">
              <h2 className="h6 mb-0">Información</h2>
            </div>
            <div className="card-body">
              <dl className="row mb-0 small">
                <Dato etiqueta="Marca" valor={producto.brand?.name} />
                <Dato etiqueta="Categoría principal" valor={producto.primary_category?.name} />
                <Dato
                  etiqueta="Sexo"
                  valor={producto.gender?.slug ? translateGender(producto.gender.slug) : null}
                />
                <Dato
                  etiqueta="Tipo de talle"
                  valor={
                    producto.size_type?.slug ? translateSizeType(producto.size_type.slug) : null
                  }
                />
                <Dato etiqueta="Precio de lista" valor={formatGuaranies(producto.list_price)} />
                <Dato
                  etiqueta="Precio de oferta"
                  valor={producto.sale_price ? formatGuaranies(producto.sale_price) : null}
                />
                <Dato etiqueta="Vigencia de la oferta" valor={vigenciaOferta(producto)} />
                <Dato etiqueta="Disponibilidad" valor={etiquetaDisponibilidad(producto)} />
                <Dato etiqueta="Descripción" valor={producto.description} />
              </dl>
            </div>
          </section>

          <section className="card mb-3">
            <div className="card-header bg-white">
              <h2 className="h6 mb-0">Clasificación</h2>
            </div>
            <div className="card-body">
              <Chips etiqueta="Categorías" items={producto.categories} />
              <Chips etiqueta="Deportes" items={producto.sports} />
              <Chips etiqueta="Talles" items={producto.sizes} />
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-5">
          <ImagesSection productId={productId} />
          <VariantsSection productId={productId} />
        </div>
      </div>
    </>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <>
      <dt className="col-5 col-sm-4 text-muted fw-normal">{etiqueta}</dt>
      <dd className="col-7 col-sm-8 mb-2">{valor || '—'}</dd>
    </>
  );
}

function Chips({ etiqueta, items }) {
  const lista = items ?? [];
  return (
    <div className="mb-3">
      <p className="small text-muted mb-1">{etiqueta}</p>
      {lista.length === 0 ? (
        <p className="small mb-0">—</p>
      ) : (
        <div className="d-flex flex-wrap gap-1">
          {lista.map((item) => (
            <span key={item.id} className="badge text-bg-light border">
              {item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function etiquetaDisponibilidad(producto) {
  return (
    AVAILABILITY_OPTIONS.find((opcion) => opcion.value === producto.availability)?.label ??
    producto.availability
  );
}

/**
 * `RN-32`: la oferta solo aplica dentro de su rango; `RN-33`: sin fecha de fin
 * rige indefinidamente. Aquí solo se muestran las fechas — **no** se recalcula
 * si está vigente, que es cosa del backend.
 */
function vigenciaOferta(producto) {
  if (!producto.sale_price) return null;
  const desde = formatDateTime(producto.sale_starts_at);
  const hasta = formatDateTime(producto.sale_ends_at);
  if (!desde && !hasta) return 'Sin límite de fechas';
  return `${desde || 'Sin inicio'} → ${hasta || 'Sin fin'}`;
}
