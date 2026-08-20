import { Link } from 'react-router-dom';

import { formatDateTime } from '../../../../shared/formatters/date.js';
import { describePromotionStatus, SCOPE_LABELS } from '../utils/promotionStatus.js';

/**
 * Tabla de promociones (07_PANEL_ADMIN.md §14.5).
 *
 * Muestra el porcentaje y el alcance tal como llegan. **No** calcula el precio
 * efectivo ni resuelve concurrencia entre promociones: eso es del backend
 * (`RN-37`), y duplicarlo aquí abriría la puerta a que panel y catálogo
 * discrepen.
 */
export function PromotionsTable({ promotions, onDelete, busyId }) {
  return (
    <>
      {/* Escritorio */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col">Promoción</th>
              <th scope="col" className="text-end">
                Descuento
              </th>
              <th scope="col">Se aplica a</th>
              <th scope="col">Vigencia</th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promocion) => (
              <tr key={promocion.id}>
                <td>
                  <Link to={`/admin/promotions/${promocion.id}`} className="fw-semibold">
                    {promocion.name}
                  </Link>
                  {promocion.description && (
                    <span className="d-block small text-muted text-truncate">
                      {promocion.description}
                    </span>
                  )}
                </td>
                <td className="text-end fw-semibold">−{promocion.discount_percentage}%</td>
                <td className="small">
                  <Alcance promocion={promocion} />
                </td>
                <td className="small">
                  <Vigencia promocion={promocion} />
                </td>
                <td>
                  <EstadoBadge promocion={promocion} />
                </td>
                <td className="text-end">
                  <Acciones
                    promocion={promocion}
                    busy={busyId === promocion.id}
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
        {promotions.map((promocion) => (
          <li key={promocion.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <Link to={`/admin/promotions/${promocion.id}`} className="fw-semibold">
                {promocion.name}
              </Link>
              <span className="fw-semibold text-nowrap">−{promocion.discount_percentage}%</span>
            </div>
            <p className="small text-muted mb-1">
              <Alcance promocion={promocion} />
            </p>
            <p className="small text-muted mb-2">
              <Vigencia promocion={promocion} />
            </p>
            <div className="d-flex align-items-center justify-content-between gap-2">
              <EstadoBadge promocion={promocion} />
              <Acciones promocion={promocion} busy={busyId === promocion.id} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** `RN-36`: el alcance es exactamente uno de producto, categoría o marca. */
function Alcance({ promocion }) {
  const tipo = promocion.scope?.type;
  return (
    <>
      <span className="badge text-bg-light border me-1">{SCOPE_LABELS[tipo] ?? tipo}</span>
      {promocion.scope?.entity?.name ?? '—'}
    </>
  );
}

/** `RN-33`: sin fecha de fin, rige indefinidamente. */
function Vigencia({ promocion }) {
  const desde = formatDateTime(promocion.starts_at);
  const hasta = promocion.ends_at ? formatDateTime(promocion.ends_at) : 'sin fin';
  return `${desde} → ${hasta}`;
}

function EstadoBadge({ promocion }) {
  const estado = describePromotionStatus(promocion);
  return <span className={`badge text-bg-${estado.tone}`}>{estado.label}</span>;
}

function Acciones({ promocion, busy, onDelete }) {
  return (
    <div
      className="btn-group btn-group-sm"
      role="group"
      aria-label={`Acciones de ${promocion.name}`}
    >
      <Link to={`/admin/promotions/${promocion.id}`} className="btn btn-outline-secondary">
        Editar
      </Link>
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={() => onDelete(promocion)}
        disabled={busy}
      >
        Eliminar
      </button>
    </div>
  );
}
