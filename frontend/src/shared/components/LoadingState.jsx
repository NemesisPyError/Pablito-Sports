/**
 * Estado de carga genérico.
 *
 * Usa un spinner de Bootstrap con etiqueta accesible.
 */
export function LoadingState({ message = 'Cargando…' }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center py-5"
      role="status"
      aria-live="polite"
    >
      <div className="spinner-border text-primary" role="img" aria-label={message}>
        <span className="visually-hidden">{message}</span>
      </div>
      <p className="mt-3 text-muted mb-0">{message}</p>
    </div>
  );
}
