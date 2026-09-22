import { Link } from 'react-router-dom';

import { formatGuaranies } from '../../../../shared/formatters/currency.js';
import { AVAILABILITY_OPTIONS } from '../hooks/useAdminProducts.js';

const TONO_DISPONIBILIDAD = {
  available: 'success',
  low_stock: 'warning',
  out_of_stock: 'secondary',
};

function etiquetaDisponibilidad(valor) {
  return AVAILABILITY_OPTIONS.find((opcion) => opcion.value === valor)?.label ?? valor;
}

/**
 * Tabla de productos del panel (07_PANEL_ADMIN.md §14.2).
 *
 * Responsive sin componentes nuevos: en pantallas anchas es una tabla; por
 * debajo de `lg` cada fila se apila como tarjeta, porque una tabla de siete
 * columnas con desplazamiento horizontal es inservible en un teléfono.
 */
export function ProductsTable({
  products,
  onToggleActive,
  onToggleHomeNew,
  onDelete,
  busyId,
}) {
  return (
    <>
      {/* Escritorio */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Marca</th>
              <th scope="col">Categoría</th>
              <th scope="col" className="text-end">
                Precio
              </th>
              <th scope="col">Disponibilidad</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {products.map((producto) => (
              <tr key={producto.id}>
                <td>
                  <Link to={`/admin/products/${producto.id}`} className="fw-semibold">
                    {producto.name}
                  </Link>
                  <span className="d-block small text-muted">{producto.sku}</span>
                </td>
                <td className="small">{producto.brand?.name ?? '—'}</td>
                <td className="small">{producto.primary_category?.name ?? '—'}</td>
                <td className="text-end">{formatGuaranies(producto.list_price)}</td>
                <td>
                  <span
                    className={`badge text-bg-${TONO_DISPONIBILIDAD[producto.availability] ?? 'secondary'}`}
                  >
                    {etiquetaDisponibilidad(producto.availability)}
                  </span>
                </td>
                <td>
                  <EstadoBadges producto={producto} />
                </td>
                <td className="text-end">
                  <Acciones
                    producto={producto}
                    busy={busyId === producto.id}
                    onToggleActive={onToggleActive}
                    onToggleHomeNew={onToggleHomeNew}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tablet */}
      <ul className="list-group d-lg-none">
        {products.map((producto) => (
          <li key={producto.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <div className="min-vw-0">
                <Link to={`/admin/products/${producto.id}`} className="fw-semibold d-block">
                  {producto.name}
                </Link>
                <span className="d-block small text-muted">{producto.sku}</span>
                <span className="d-block small text-muted">
                  {producto.brand?.name ?? '—'} · {producto.primary_category?.name ?? '—'}
                </span>
              </div>
              <span className="fw-semibold text-nowrap">
                {formatGuaranies(producto.list_price)}
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center gap-1 mt-2">
              <span
                className={`badge text-bg-${TONO_DISPONIBILIDAD[producto.availability] ?? 'secondary'}`}
              >
                {etiquetaDisponibilidad(producto.availability)}
              </span>
              <EstadoBadges producto={producto} />
            </div>

            <div className="mt-2">
              <Acciones
                producto={producto}
                busy={busyId === producto.id}
                onToggleActive={onToggleActive}
                onToggleHomeNew={onToggleHomeNew}
                onDelete={onDelete}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function EstadoBadges({ producto }) {
  return (
    <>
      <span className={`badge text-bg-${producto.is_active ? 'success' : 'secondary'}`}>
        {producto.is_active ? 'Activo' : 'Oculto'}
      </span>
      {producto.is_featured && <span className="badge text-bg-light border ms-1">Destacado</span>}
      {producto.is_new && <span className="badge text-bg-light border ms-1">Nuevo</span>}
      {producto.home_new_position != null && (
        <span className="badge text-bg-light border ms-1">Novedades</span>
      )}
      {!producto.has_image && <span className="badge text-bg-warning ms-1">Sin imagen</span>}
    </>
  );
}

function Acciones({ producto, busy, onToggleActive, onToggleHomeNew, onDelete }) {
  return (
    <div
      className="btn-group btn-group-sm"
      role="group"
      aria-label={`Acciones de ${producto.name}`}
    >
      <Link to={`/admin/products/${producto.id}`} className="btn btn-outline-secondary">
        Ver
      </Link>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => onToggleActive(producto)}
        disabled={busy}
      >
        {producto.is_active ? 'Ocultar' : 'Activar'}
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => onToggleHomeNew(producto)}
        disabled={busy}
      >
        {producto.home_new_position != null ? 'Quitar de novedades' : 'Agregar a novedades'}
      </button>
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={() => onDelete(producto)}
        disabled={busy}
      >
        Eliminar
      </button>
    </div>
  );
}
