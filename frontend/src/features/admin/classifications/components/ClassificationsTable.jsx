import { Link } from 'react-router-dom';

import { translateSizeType } from '../../../../shared/config/labels.js';

/**
 * Listado de una clasificación (07_PANEL_ADMIN.md §14.4).
 *
 * Tabla en escritorio y tarjetas en móvil, igual que el resto del panel.
 *
 * Muestra las eliminadas porque `AD-18` es borrado lógico y §9.5 a §9.9 ofrecen
 * restauración: ocultarlas dejaría filas irrecuperables desde la interfaz.
 */
export function ClassificationsTable({ items, config, onDelete, onRestore, busyId, categorias }) {
  const nombreDelPadre = (parentId) =>
    categorias?.find((categoria) => categoria.id === parentId)?.name ?? '—';

  const extra = (item) => {
    if (config.campoExtra === 'parent')
      return item.parent_id ? nombreDelPadre(item.parent_id) : '—';
    if (config.campoExtra === 'sizeType') {
      return item.size_type?.slug ? translateSizeType(item.size_type.slug) : '—';
    }
    return null;
  };

  const etiquetaExtra = {
    parent: 'Categoría padre',
    sizeType: 'Tipo de talle',
  }[config.campoExtra];

  return (
    <>
      {/* Escritorio */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col">Nombre</th>
              {etiquetaExtra && <th scope="col">{etiquetaExtra}</th>}
              <th scope="col">Estado</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/admin/${config.ruta}/${item.id}`} className="fw-semibold">
                    {item.name}
                  </Link>
                </td>
                {etiquetaExtra && <td className="small">{extra(item)}</td>}
                <td>
                  <Estado item={item} />
                </td>
                <td className="text-end">
                  <Acciones
                    item={item}
                    config={config}
                    busy={busyId === item.id}
                    onDelete={onDelete}
                    onRestore={onRestore}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tablet */}
      <ul className="list-group d-lg-none">
        {items.map((item) => (
          <li key={item.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-1">
              <Link to={`/admin/${config.ruta}/${item.id}`} className="fw-semibold">
                {item.name}
              </Link>
              <Estado item={item} />
            </div>
            {etiquetaExtra && <p className="small text-muted mb-2">{extra(item)}</p>}
            <Acciones
              item={item}
              config={config}
              busy={busyId === item.id}
              onDelete={onDelete}
              onRestore={onRestore}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function Estado({ item }) {
  if (item.deleted_at) return <span className="badge text-bg-danger">Eliminado</span>;
  return (
    <span className={`badge text-bg-${item.is_active ? 'success' : 'secondary'}`}>
      {item.is_active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function Acciones({ item, config, busy, onDelete, onRestore }) {
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={`Acciones de ${item.name}`}>
      <Link to={`/admin/${config.ruta}/${item.id}`} className="btn btn-outline-secondary">
        Editar
      </Link>
      {item.deleted_at ? (
        <button
          type="button"
          className="btn btn-outline-success"
          onClick={() => onRestore(item)}
          disabled={busy}
        >
          Restaurar
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-outline-danger"
          onClick={() => onDelete(item)}
          disabled={busy}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}
