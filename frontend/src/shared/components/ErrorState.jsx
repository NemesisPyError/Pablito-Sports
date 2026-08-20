/**
 * Estado de error con acción de reintento.
 */
export function ErrorState({ title = 'No pudimos cargar la información', message, onRetry }) {
  return (
    <div className="text-center py-5" role="alert" aria-live="assertive">
      <p className="fw-semibold mb-2">{title}</p>
      {message && <p className="text-muted small mb-3">{message}</p>}
      {onRetry && (
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRetry}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
