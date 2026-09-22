/**
 * Estado vacío con mensaje y acción opcional.
 *
 * `icon` (v2.9.11, pedido explícito del usuario, rediseño del dashboard) es
 * opcional y retrocompatible: sin él, el componente se ve exactamente igual
 * que antes en todos sus usos actuales (catálogo público, listados del
 * panel). Quien lo pase provee su propio nodo (por ejemplo `<AdminIcon
 * name="..."/>`) — este componente no conoce ningún set de íconos en
 * particular, solo reserva el círculo donde se monta.
 *
 * `role="status"`: al filtrar el catálogo el vacío aparece sin cambiar de
 * página, y sin región viva un lector de pantalla no anuncia que la búsqueda
 * no dio resultados.
 */
export function EmptyState({ title = 'No hay resultados', message, actionLabel, onAction, icon }) {
  return (
    <div className="text-center py-5" role="status">
      {icon && (
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light text-secondary mb-3"
          style={{ width: '3.5rem', height: '3.5rem' }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}
      <p className="fw-semibold mb-2">{title}</p>
      {message && <p className="text-muted small mb-3">{message}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
