import { useState } from 'react';

import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import { ROLES, toCreatePayload, toUpdatePayload, toFormValues, validateUser } from '../utils/userForm.js';

/**
 * Formulario de alta y edición de administradores (05_API.md §10.10,
 * 07_PANEL_ADMIN.md §14.9).
 *
 * Los campos son los de `AdministratorCreateDTO` / `AdministratorUpdateDTO`. La
 * contraseña solo aparece en el alta: en edición tiene su propio flujo (§9.14)
 * para que un guardado de perfil no la toque por accidente. El estado
 * activo/inactivo solo aparece en edición: el alta siempre crea activo.
 */
export function UserForm({ user, onSubmit, onCancel, saving, submitError }) {
  const esEdicion = Boolean(user);
  const [values, setValues] = useState(() => toFormValues(user));
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  function cambiar(campo) {
    return (evento) => {
      const valor =
        evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
      const proximo = { ...values, [campo]: valor };
      setValues(proximo);
      if (tocado) setErrors(validateUser(proximo, { isEdit: esEdicion }));
    };
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);
    const encontrados = validateUser(values, { isEdit: esEdicion });
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    onSubmit(esEdicion ? toUpdatePayload(values) : toCreatePayload(values));
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <label htmlFor="username" className="form-label">
            Nombre de usuario
          </label>
          <input
            id="username"
            className={`form-control ${errors.username ? 'is-invalid' : ''}`}
            value={values.username}
            onChange={cambiar('username')}
            maxLength={100}
            autoComplete="off"
          />
          {errors.username && <p className="invalid-feedback mb-0">{errors.username}</p>}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="email" className="form-label">
            Correo
          </label>
          <input
            id="email"
            type="email"
            className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            value={values.email}
            onChange={cambiar('email')}
            maxLength={255}
            autoComplete="off"
          />
          {errors.email && <p className="invalid-feedback mb-0">{errors.email}</p>}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="role" className="form-label">
            Rol
          </label>
          <select
            id="role"
            className={`form-select ${errors.role ? 'is-invalid' : ''}`}
            value={values.role}
            onChange={cambiar('role')}
          >
            {ROLES.map((opcion) => (
              <option key={opcion.value} value={opcion.value}>
                {opcion.label}
              </option>
            ))}
          </select>
          {errors.role ? (
            <p className="invalid-feedback mb-0">{errors.role}</p>
          ) : (
            <p className="form-text mb-0">
              El superadministrador además gestiona usuarios.
            </p>
          )}
        </div>

        {!esEdicion && (
          <div className="col-12 col-lg-6">
            <label htmlFor="password" className="form-label">
              Contraseña inicial
            </label>
            <input
              id="password"
              type="password"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
              value={values.password}
              onChange={cambiar('password')}
              autoComplete="new-password"
            />
            {errors.password ? (
              <p className="invalid-feedback mb-0">{errors.password}</p>
            ) : (
              <p className="form-text mb-0">Mínimo 12 caracteres. Pedile que la cambie al ingresar.</p>
            )}
          </div>
        )}

        {esEdicion && (
          <div className="col-12">
            <div className="form-check form-switch">
              <input
                id="is_active"
                type="checkbox"
                className="form-check-input"
                checked={values.is_active}
                onChange={cambiar('is_active')}
              />
              <label htmlFor="is_active" className="form-check-label">
                Cuenta activa
              </label>
            </div>
            <p className="form-text mb-0">
              Al desactivar una cuenta se cierran sus sesiones abiertas. No se puede desactivar al
              último superadministrador activo.
            </p>
          </div>
        )}
      </div>

      {submitError && (
        <div className="alert alert-danger py-2 small mt-3" role="alert">
          {mensajeDeGuardado(submitError)}
        </div>
      )}

      <div className="d-flex gap-2 mt-4">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

/** Traduce el código del contrato, nunca el mensaje del servidor (`ERR-04`). */
function mensajeDeGuardado(error) {
  if (error?.status === 429) return RATE_LIMIT_MESSAGE;
  if (error?.status === 422) {
    const campos = error.errors?.map((item) => item.field).filter(Boolean) ?? [];
    if (campos.includes('username') || campos.includes('email')) {
      return 'El nombre de usuario o el correo ya están en uso.';
    }
    return campos.length > 0 ? `Revisá estos campos: ${campos.join(', ')}.` : 'Algún dato no es válido.';
  }
  if (error?.status === 409) {
    // RN-71 / RN-72: el backend cita la regla en el error.
    return 'La operación dejaría el sistema sin un superadministrador válido.';
  }
  if (error?.status === 403) return 'Necesitás rol de superadministrador.';
  if (error?.status === 404) return 'El usuario ya no existe.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar el usuario. Intentá de nuevo.';
}
