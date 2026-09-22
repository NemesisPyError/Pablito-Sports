import { useEffect } from 'react';

import { ChangePasswordForm } from './ChangePasswordForm.jsx';

/**
 * Diálogo de cambio de contraseña de un administrador (07_PANEL_ADMIN.md §8.4).
 *
 * §4.1 principio 4: las operaciones de alto impacto requieren confirmación
 * explícita. Cambiar una contraseña invalida las sesiones de ese usuario (§7.3),
 * así que se aísla en su propio diálogo en lugar de mezclarla con la edición de
 * perfil.
 *
 * Mismo armazón visual que `ConfirmDialog` (modal Bootstrap sin JS de Bootstrap).
 */
export function ChangePasswordDialog({ isOpen, user, isSelf, onSubmit, onCancel, saving, error }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    function alPulsar(evento) {
      if (evento.key === 'Escape' && !saving) onCancel?.();
    }
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [isOpen, saving, onCancel]);

  if (!isOpen || !user) return null;

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changePasswordTitle"
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h6" id="changePasswordTitle">
                {isSelf ? 'Cambiar mi contraseña' : `Cambiar contraseña de ${user.username}`}
              </h2>
            </div>
            <div className="modal-body">
              {isSelf ? (
                <p className="small text-muted">
                  Al cambiarla, tu sesión se cerrará y tendrás que volver a ingresar.
                </p>
              ) : (
                <p className="small text-muted">
                  Se cambiará la contraseña de <strong>{user.username}</strong> y se cerrarán sus
                  sesiones abiertas.
                </p>
              )}

              <ChangePasswordForm
                // Remonta el formulario por usuario: su estado no debe arrastrarse
                // de un objetivo al siguiente.
                key={user.id}
                requireCurrent={isSelf}
                onSubmit={onSubmit}
                onCancel={onCancel}
                saving={saving}
                submitError={error}
                submitLabel="Cambiar contraseña"
                idPrefix={`pwd-${user.id}`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
