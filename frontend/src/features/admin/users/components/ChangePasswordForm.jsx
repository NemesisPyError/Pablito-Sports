import { useState } from 'react';

import { PasswordField } from '../../../../shared/components/PasswordField.jsx';
import { validatePasswordChange } from '../utils/userForm.js';

/**
 * Campos del cambio de contraseña (05_API.md §9.14, 07_PANEL_ADMIN.md §14.9).
 *
 * `requireCurrent` distingue los dos caminos de §9.14: cambiar la propia exige
 * `current_password`; un superadministrador cambiando la de otro, no. La nueva
 * contraseña se pide dos veces para atrapar tipeos antes de invalidar sesiones.
 *
 * No ejecuta la mutación: emite `onSubmit({ currentPassword, newPassword })`.
 */
export function ChangePasswordForm({
  requireCurrent,
  onSubmit,
  onCancel,
  saving,
  submitError,
  submitLabel = 'Cambiar contraseña',
  idPrefix = 'pwd',
}) {
  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  function cambiar(campo) {
    return (evento) => {
      const proximo = { ...values, [campo]: evento.target.value };
      setValues(proximo);
      if (tocado) setErrors(validatePasswordChange(proximo, { requireCurrent }));
    };
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);
    const encontrados = validatePasswordChange(values, { requireCurrent });
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    onSubmit({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  }

  return (
    <form onSubmit={enviar} noValidate>
      {requireCurrent && (
        <div className="mb-3">
          <label htmlFor={`${idPrefix}-current`} className="form-label">
            Contraseña actual
          </label>
          <PasswordField
            id={`${idPrefix}-current`}
            autoComplete="current-password"
            className={`form-control ${errors.currentPassword ? 'is-invalid' : ''}`}
            value={values.currentPassword}
            onChange={cambiar('currentPassword')}
          />
          {errors.currentPassword && (
            <p className="invalid-feedback mb-0">{errors.currentPassword}</p>
          )}
        </div>
      )}

      <div className="mb-3">
        <label htmlFor={`${idPrefix}-new`} className="form-label">
          Nueva contraseña
        </label>
        <PasswordField
          id={`${idPrefix}-new`}
          autoComplete="new-password"
          className={`form-control ${errors.newPassword ? 'is-invalid' : ''}`}
          value={values.newPassword}
          onChange={cambiar('newPassword')}
        />
        {errors.newPassword ? (
          <p className="invalid-feedback mb-0">{errors.newPassword}</p>
        ) : (
          <p className="form-text mb-0">Mínimo 12 caracteres.</p>
        )}
      </div>

      <div className="mb-3">
        <label htmlFor={`${idPrefix}-confirm`} className="form-label">
          Repetir nueva contraseña
        </label>
        <PasswordField
          id={`${idPrefix}-confirm`}
          autoComplete="new-password"
          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
          value={values.confirmPassword}
          onChange={cambiar('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="invalid-feedback mb-0">{errors.confirmPassword}</p>
        )}
      </div>

      {submitError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {mensajeDeError(submitError)}
        </div>
      )}

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

/** Traduce el código estable del contrato, nunca el mensaje del servidor (`ERR-04`). */
function mensajeDeError(error) {
  if (error?.status === 401) {
    // §16.1: el backend no distingue "no coincide" de otra cosa.
    return 'La contraseña actual no es correcta.';
  }
  if (error?.status === 403) {
    return 'No tenés permiso para cambiar esta contraseña.';
  }
  if (error?.status === 422) {
    // El motivo exacto lo decide el servidor (longitud, trivial o pasarse del
    // tope de bcrypt); acá se resume sin afirmar cuál de los tres fue.
    return 'Esa contraseña no cumple la política: mínimo 12 caracteres y evitá las obvias.';
  }
  if (error?.status === 429) {
    // 03_SEGURIDAD.md §14.1: 3 intentos cada 15 minutos por sesión.
    return 'Demasiados intentos. Esperá unos minutos antes de volver a probar.';
  }
  if (error?.isNetworkFailure) {
    return 'No pudimos conectar con el servidor.';
  }
  return 'No pudimos cambiar la contraseña. Intentá de nuevo.';
}
