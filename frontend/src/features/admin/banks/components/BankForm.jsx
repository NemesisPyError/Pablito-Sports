import { useState } from 'react';

import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import { BankImageField } from './BankImageField.jsx';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_DISCOUNT,
  MAX_NAME_LENGTH,
  MIN_DISCOUNT,
  toFormData,
  toFormValues,
  validate,
} from '../utils/bankForm.js';

/**
 * Formulario de banco de Superdescuentos, mismo criterio que `BannerForm`.
 *
 * Los campos son los de `BankCreateDTO` / `BankUpdateDTO`: nombre, descripción
 * (v1.6.0, pedido explícito del usuario — nota interna, no se muestra en la
 * tarjeta pública), porcentaje, posición, mini banner y estado.
 */
export function BankForm({ bank, onSubmit, onCancel, saving, submitError }) {
  const [values, setValues] = useState(() => toFormValues(bank));
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  const hasImage = Boolean(file || bank?.image_url);

  function revalidar(siguientes, archivo) {
    if (!tocado) return;
    setErrors(validate(siguientes, { hasImage: Boolean(archivo || bank?.image_url) }));
  }

  function cambiar(campo) {
    return (evento) => {
      const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
      const siguientes = { ...values, [campo]: valor };
      setValues(siguientes);
      revalidar(siguientes, file);
    };
  }

  function elegirImagen(archivo) {
    setFile(archivo);
    revalidar(values, archivo);
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);

    const encontrados = validate(values, { hasImage });
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toFormData(values, file));
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <label htmlFor="name" className="form-label">
            Nombre del banco
          </label>
          <input
            id="name"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={values.name}
            onChange={cambiar('name')}
            maxLength={MAX_NAME_LENGTH}
          />
          {errors.name && <p className="invalid-feedback mb-0">{errors.name}</p>}
        </div>

        <div className="col-12">
          <label htmlFor="description" className="form-label">
            Descripción <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <textarea
            id="description"
            className={`form-control ${errors.description ? 'is-invalid' : ''}`}
            value={values.description}
            onChange={cambiar('description')}
            maxLength={MAX_DESCRIPTION_LENGTH}
            rows={2}
          />
          {errors.description ? (
            <p className="invalid-feedback mb-0">{errors.description}</p>
          ) : (
            <p className="form-text mb-0">
              Nota interna para el panel; no se muestra en Superdescuentos.
            </p>
          )}
        </div>

        <div className="col-6 col-lg-2">
          <label htmlFor="discount_percentage" className="form-label">
            Porcentaje
          </label>
          <div className="input-group">
            <input
              id="discount_percentage"
              type="number"
              inputMode="numeric"
              min={MIN_DISCOUNT}
              max={MAX_DISCOUNT}
              step={1}
              className={`form-control ${errors.discount_percentage ? 'is-invalid' : ''}`}
              value={values.discount_percentage}
              onChange={cambiar('discount_percentage')}
            />
            <span className="input-group-text">%</span>
          </div>
          {errors.discount_percentage && (
            <p className="invalid-feedback d-block mb-0">{errors.discount_percentage}</p>
          )}
        </div>

        <div className="col-6 col-lg-2">
          <label htmlFor="position" className="form-label">
            Posición
          </label>
          <input
            id="position"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            className={`form-control ${errors.position ? 'is-invalid' : ''}`}
            value={values.position}
            onChange={cambiar('position')}
          />
          {errors.position ? (
            <p className="invalid-feedback mb-0">{errors.position}</p>
          ) : (
            <p className="form-text mb-0">Menor número, más arriba.</p>
          )}
        </div>

        <div className="col-12">
          <BankImageField
            currentImageUrl={bank?.image_url}
            file={file}
            onSelect={elegirImagen}
            error={errors.image}
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
              Banco activo
            </label>
          </div>
          <p className="form-text mb-0">
            Inactivo, el banco deja de mostrarse en Superdescuentos sin borrar sus datos.
          </p>
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
  if (error?.status === 429) return RATE_LIMIT_MESSAGE;
  if (error?.status === 422) {
    const campos = error.errors?.map((item) => item.field).filter(Boolean) ?? [];
    if (campos.includes('image')) {
      return 'La imagen no es válida: revisá el formato y las dimensiones.';
    }
    return campos.length > 0
      ? `Revisá estos campos: ${campos.join(', ')}.`
      : 'Algún dato no es válido.';
  }
  if (error?.status === 413) return 'La imagen supera el tamaño máximo permitido.';
  if (error?.status === 404) return 'El banco ya no existe.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar el banco. Intentá de nuevo.';
}
