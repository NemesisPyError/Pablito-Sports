/**
 * Estado vacío con mensaje y acción opcional.
 */
export function EmptyState({ title = 'No hay resultados', message, actionLabel, onAction }) {
  return (
    <div className="text-center py-5">
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
