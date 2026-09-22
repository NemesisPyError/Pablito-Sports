import { describeApiError, isRateLimit, RATE_LIMIT_MESSAGE } from '../services/errorMessages.js';

/**
 * Estado de error con acción de reintento.
 *
 * Si se pasa `error` (un `ApiError`):
 * - un `429` **siempre** muestra el mensaje de límite de tasa y **oculta el
 *   botón de reintento** — volver a pedir en el acto solo vuelve a chocar con
 *   el límite (03_SEGURIDAD.md §14);
 * - para el resto, si la pantalla no trae `message` propio, el texto sale del
 *   catálogo central (06_FRONTEND.md §10.5).
 *
 * `title` / `message` explícitos siguen gobernando todo lo que no sea un `429`.
 */
export function ErrorState({
  title = 'No pudimos cargar la información',
  message,
  error,
  onRetry,
}) {
  const esLimite = isRateLimit(error);
  const textoFinal = esLimite
    ? RATE_LIMIT_MESSAGE
    : (message ?? (error ? describeApiError(error) : undefined));
  const permiteReintento = onRetry && !esLimite;

  return (
    <div className="text-center py-5" role="alert" aria-live="assertive">
      <p className="fw-semibold mb-2">{title}</p>
      {textoFinal && <p className="text-muted small mb-3">{textoFinal}</p>}
      {permiteReintento && (
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={onRetry}>
          Intentar de nuevo
        </button>
      )}
    </div>
  );
}
