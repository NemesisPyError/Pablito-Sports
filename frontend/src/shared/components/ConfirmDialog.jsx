import { useEffect, useRef } from 'react';

/**
 * Diálogo de confirmación (09_COMPONENTES.md §9.4).
 *
 * 07_PANEL_ADMIN.md §4.1 principio 4: *"las operaciones destructivas o de alto
 * impacto requieren confirmación explícita"*.
 *
 * **No ejecuta la acción**: emite `onConfirm` para que el consumidor decida.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);

  // Accesibilidad: el foco entra en el diálogo y `Escape` lo cierra.
  useEffect(() => {
    if (!isOpen) return undefined;

    confirmRef.current?.focus();

    function alPulsar(evento) {
      if (evento.key === 'Escape' && !busy) onCancel?.();
    }
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [isOpen, busy, onCancel]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        // `alertdialog` y no `dialog`: interrumpe para pedir una decisión.
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmDialogTitle"
        aria-describedby="confirmDialogMessage"
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h6" id="confirmDialogTitle">
                {title}
              </h2>
            </div>
            <div className="modal-body">
              <p className="mb-0" id="confirmDialogMessage">
                {message}
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onCancel}
                disabled={busy}
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`btn btn-${variant} btn-sm`}
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? 'Procesando…' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
