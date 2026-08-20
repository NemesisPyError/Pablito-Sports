import { useCallback, useState } from 'react';

import { ScopeSelector } from './ScopeSelector.jsx';
import {
  MAX_DISCOUNT,
  MIN_DISCOUNT,
  toFormValues,
  toPayload,
  validate,
} from '../utils/promotionForm.js';

/**
 * Formulario de promoción (05_API.md §10.9, 07_PANEL_ADMIN.md §14.5).
 *
 * Los campos son exactamente los de `PromotionCreateDTO` / `PromotionUpdateDTO`.
 * La validación replica lo que el backend ya exige, para avisar antes de la
 * petición; el servidor sigue siendo quien decide.
 */
export function PromotionForm({ promotion, onSubmit, onCancel, saving, submitError }) {
  const [values, setValues] = useState(() => toFormValues(promotion));
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  const actualizar = useCallback((cambios) => {
    setValues((previos) => ({ ...previos, ...cambios }));
  }, []);

  function cambiar(campo) {
    return (evento) => {
      const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
      actualizar({ [campo]: valor });
      // Revalidar en caliente solo después del primer intento: avisar mientras
      // todavía está escribiendo el primer carácter es ruido.
      if (tocado) setErrors(validate({ ...values, [campo]: valor }));
    };
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);

    const encontrados = validate(values);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toPayload(values));
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <label htmlFor="name" className="form-label">
            Nombre
          </label>
          <input
            id="name"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={values.name}
            onChange={cambiar('name')}
            maxLength={255}
          />
          {errors.name && <p className="invalid-feedback mb-0">{errors.name}</p>}
        </div>

        <div className="col-12 col-lg-4">
          <label htmlFor="discount_percentage" className="form-label">
            Descuento (%)
          </label>
          <input
            id="discount_percentage"
            type="number"
            inputMode="numeric"
            min={MIN_DISCOUNT}
            max={MAX_DISCOUNT}
            className={`form-control ${errors.discount_percentage ? 'is-invalid' : ''}`}
            value={values.discount_percentage}
            onChange={cambiar('discount_percentage')}
          />
          {errors.discount_percentage && (
            <p className="invalid-feedback mb-0">{errors.discount_percentage}</p>
          )}
        </div>

        <div className="col-12">
          <label htmlFor="description" className="form-label">
            Descripción <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            className="form-control"
            rows={2}
            value={values.description}
            onChange={cambiar('description')}
          />
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="starts_at" className="form-label">
            Inicio
          </label>
          <input
            id="starts_at"
            type="datetime-local"
            className={`form-control ${errors.starts_at ? 'is-invalid' : ''}`}
            value={values.starts_at}
            onChange={cambiar('starts_at')}
          />
          {errors.starts_at && <p className="invalid-feedback mb-0">{errors.starts_at}</p>}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="ends_at" className="form-label">
            Fin <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <input
            id="ends_at"
            type="datetime-local"
            className={`form-control ${errors.ends_at ? 'is-invalid' : ''}`}
            value={values.ends_at}
            onChange={cambiar('ends_at')}
          />
          {errors.ends_at ? (
            <p className="invalid-feedback mb-0">{errors.ends_at}</p>
          ) : (
            // `RN-33`: sin fecha de fin la promoción rige indefinidamente.
            <p className="form-text mb-0">Sin fecha de fin, rige indefinidamente.</p>
          )}
        </div>

        <div className="col-12">
          <ScopeSelector
            scopeType={values.scopeType}
            scopeId={values.scopeId}
            scopeSlug={values.scopeSlug}
            onChange={actualizar}
            error={errors.scopeId}
            disabled={saving}
          />
        </div>

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
              Promoción activa
            </label>
          </div>
        </div>
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
  if (error?.status === 422) {
    const campos = error.errors?.map((item) => item.field).filter(Boolean) ?? [];
    return campos.length > 0
      ? `Revisá estos campos: ${campos.join(', ')}.`
      : 'Algún dato no es válido.';
  }
  if (error?.status === 404) return 'La promoción ya no existe.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar la promoción. Intentá de nuevo.';
}
