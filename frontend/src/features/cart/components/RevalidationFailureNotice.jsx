/**
 * Revalidación no completada (RN-81, AD-30).
 *
 * Un fallo de red nunca bloquea la consulta por sí solo. Se ofrecen las tres
 * opciones que define 06_FRONTEND.md §11.7.
 */
export function RevalidationFailureNotice({ onRetry, onCancel, onSendAnyway }) {
  return (
    <section className="alert alert-secondary" role="alert">
      <h2 className="h6 alert-heading">No pudimos verificar tu carrito</h2>
      <p className="mb-3">Los precios y la disponibilidad podrían haber cambiado.</p>
      <div className="d-flex gap-2 flex-wrap">
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Reintentar
        </button>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
          Cancelar
        </button>
        <button type="button" className="btn btn-outline-primary" onClick={onSendAnyway}>
          Enviar igualmente
        </button>
      </div>
    </section>
  );
}
