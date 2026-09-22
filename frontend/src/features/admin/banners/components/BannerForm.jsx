import { useState } from 'react';

import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import { BannerImageField } from './BannerImageField.jsx';
import {
  MAX_BUTTON_LABEL_LENGTH,
  MAX_LINK_LENGTH,
  MAX_SUBTITLE_LENGTH,
  MAX_TITLE_LENGTH,
  PLACEMENTS,
  toFormData,
  toFormValues,
  validate,
} from '../utils/bannerForm.js';

/**
 * Formulario de banner (05_API.md §10.13, 07_PANEL_ADMIN.md §14.6).
 *
 * Los campos son exactamente los de `BannerCreateDTO` / `BannerUpdateDTO`. La
 * validación replica lo que el backend ya exige, para avisar antes de la
 * petición; el servidor sigue siendo quien decide.
 *
 * En móvil el formulario es de una sola columna: las clases `col-lg-*` solo
 * parten la fila a partir de escritorio.
 */
export function BannerForm({ banner, onSubmit, onCancel, saving, submitError }) {
  const [values, setValues] = useState(() => toFormValues(banner));
  const [file, setFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  // §10.13: al editar ya hay imagen, así que el campo solo es obligatorio
  // cuando no existe ninguna, es decir, al crear.
  const hasImage = Boolean(file || banner?.image_url);

  function revalidar(siguientes, archivo) {
    if (!tocado) return;
    setErrors(validate(siguientes, { hasImage: Boolean(archivo || banner?.image_url) }));
  }

  function cambiar(campo) {
    return (evento) => {
      const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
      const siguientes = { ...values, [campo]: valor };
      setValues(siguientes);
      // Revalidar en caliente solo después del primer intento: avisar mientras
      // todavía está escribiendo el primer carácter es ruido.
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
          <label htmlFor="title" className="form-label">
            Título
          </label>
          <input
            id="title"
            className={`form-control ${errors.title ? 'is-invalid' : ''}`}
            value={values.title}
            onChange={cambiar('title')}
            maxLength={MAX_TITLE_LENGTH}
          />
          {errors.title && <p className="invalid-feedback mb-0">{errors.title}</p>}
        </div>

        <div className="col-12 col-lg-4">
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
            // `RN-73`: el orden es un campo propio. No hay regla de unicidad:
            // dos banners pueden compartir posición y desempata el `id`.
            <p className="form-text mb-0">Menor número, más arriba.</p>
          )}
        </div>

        <div className="col-12">
          <label htmlFor="subtitle" className="form-label">
            Subtítulo <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <input
            id="subtitle"
            className={`form-control ${errors.subtitle ? 'is-invalid' : ''}`}
            value={values.subtitle}
            onChange={cambiar('subtitle')}
            maxLength={MAX_SUBTITLE_LENGTH}
          />
          {errors.subtitle && <p className="invalid-feedback mb-0">{errors.subtitle}</p>}
        </div>

        <div className="col-12">
          <label htmlFor="link_url" className="form-label">
            Enlace <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <input
            id="link_url"
            className={`form-control ${errors.link_url ? 'is-invalid' : ''}`}
            value={values.link_url}
            onChange={cambiar('link_url')}
            maxLength={MAX_LINK_LENGTH}
            placeholder="/productos/botines o https://…"
          />
          {errors.link_url ? (
            <p className="invalid-feedback mb-0">{errors.link_url}</p>
          ) : (
            <p className="form-text mb-0">A dónde lleva el banner al tocarlo.</p>
          )}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="button_label" className="form-label">
            Texto del botón <span className="text-muted fw-normal">(opcional)</span>
          </label>
          <input
            id="button_label"
            className={`form-control ${errors.button_label ? 'is-invalid' : ''}`}
            value={values.button_label}
            onChange={cambiar('button_label')}
            maxLength={MAX_BUTTON_LABEL_LENGTH}
            placeholder="Ver colección"
          />
          {errors.button_label ? (
            <p className="invalid-feedback mb-0">{errors.button_label}</p>
          ) : (
            <p className="form-text mb-0">Sin enlace, el botón no se muestra.</p>
          )}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="placement" className="form-label">
            Zona de la portada
          </label>
          <select
            id="placement"
            className={`form-select ${errors.placement ? 'is-invalid' : ''}`}
            value={values.placement}
            onChange={cambiar('placement')}
          >
            {PLACEMENTS.map((zona) => (
              <option key={zona.value} value={zona.value}>
                {zona.label}
              </option>
            ))}
          </select>
          {errors.placement ? (
            <p className="invalid-feedback mb-0">{errors.placement}</p>
          ) : (
            <p className="form-text mb-0">Dónde aparece la pieza dentro de la portada.</p>
          )}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="starts_at" className="form-label">
            Inicio <span className="text-muted fw-normal">(opcional)</span>
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
            // `RN-74`: sin vigencia, el banner es permanente mientras esté activo.
            <p className="form-text mb-0">Sin fechas, el banner es permanente.</p>
          )}
        </div>

        <div className="col-12">
          <BannerImageField
            currentImageUrl={banner?.image_url}
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
              Banner activo
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
  if (error?.status === 429) return RATE_LIMIT_MESSAGE;
  if (error?.status === 422) {
    const campos = error.errors?.map((item) => item.field).filter(Boolean) ?? [];
    // 03_SEGURIDAD.md §11.1: la imagen también se rechaza por formato,
    // dimensiones o contenido, no solo por faltar.
    if (campos.includes('image')) {
      return 'La imagen no es válida: revisá el formato y las dimensiones.';
    }
    return campos.length > 0
      ? `Revisá estos campos: ${campos.join(', ')}.`
      : 'Algún dato no es válido.';
  }
  if (error?.status === 413) return 'La imagen supera el tamaño máximo permitido.';
  if (error?.status === 404) return 'El banner ya no existe.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar el banner. Intentá de nuevo.';
}
