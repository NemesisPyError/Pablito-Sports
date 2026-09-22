import { Link } from 'react-router-dom';

/**
 * Listado de bancos de Superdescuentos, mismo criterio que `BannersTable`:
 * tabla en escritorio y tarjetas en móvil.
 */
export function BanksTable({ banks, onDelete, busyId }) {
  return (
    <>
      {/* Escritorio */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col" style={{ width: '7rem' }}>
                Mini banner
              </th>
              <th scope="col">Banco</th>
              <th scope="col" className="text-end">
                Porcentaje
              </th>
              <th scope="col" className="text-end">
                Posición
              </th>
              <th scope="col">Estado</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {banks.map((bank) => (
              <tr key={bank.id}>
                <td>
                  <Miniatura bank={bank} />
                </td>
                <td>
                  <Link to={`/admin/banks/${bank.id}`} className="fw-semibold">
                    {bank.name}
                  </Link>
                </td>
                <td className="text-end fw-semibold">{bank.discount_percentage}%</td>
                <td className="text-end">{bank.position}</td>
                <td>
                  <EstadoBadge bank={bank} />
                </td>
                <td className="text-end">
                  <Acciones bank={bank} busy={busyId === bank.id} onDelete={onDelete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tablet */}
      <ul className="list-group d-lg-none">
        {banks.map((bank) => (
          <li key={bank.id} className="list-group-item">
            <Miniatura bank={bank} className="mb-2" />
            <div className="d-flex justify-content-between align-items-start gap-2">
              <Link to={`/admin/banks/${bank.id}`} className="fw-semibold">
                {bank.name}
              </Link>
              <span className="badge text-bg-light border text-nowrap">
                {bank.discount_percentage}%
              </span>
            </div>
            <p className="small text-muted mb-2">Posición {bank.position}</p>
            <div className="d-flex align-items-center justify-content-between gap-2">
              <EstadoBadge bank={bank} />
              <Acciones bank={bank} busy={busyId === bank.id} onDelete={onDelete} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Miniatura({ bank, className = '' }) {
  if (!bank.image_url) {
    return (
      <div className={`ratio ratio-1x1 bg-light rounded ${className}`} style={{ maxWidth: '5rem' }}>
        <div className="d-flex align-items-center justify-content-center text-muted">
          <span className="small">—</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`ratio ratio-1x1 bg-light rounded overflow-hidden ${className}`}
      style={{ maxWidth: '5rem' }}
    >
      <img
        src={bank.image_url}
        alt=""
        loading="lazy"
        decoding="async"
        className="w-100 h-100 object-fit-contain"
      />
    </div>
  );
}

function EstadoBadge({ bank }) {
  return (
    <span className={`badge text-bg-${bank.is_active ? 'success' : 'secondary'}`}>
      {bank.is_active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function Acciones({ bank, busy, onDelete }) {
  return (
    <div className="btn-group btn-group-sm" role="group" aria-label={`Acciones de ${bank.name}`}>
      <Link to={`/admin/banks/${bank.id}`} className="btn btn-outline-secondary">
        Editar
      </Link>
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={() => onDelete(bank)}
        disabled={busy}
      >
        Eliminar
      </button>
    </div>
  );
}
