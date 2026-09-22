import { useState } from 'react';

import { translateGender, translateSizeType } from '../../../../shared/config/labels.js';
import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import {
  parentOptions,
  sizeNameHint,
  slugify,
  toFormValues,
  toggleGender,
  toPayload,
  validate,
} from '../utils/classificationForm.js';

/**
 * Formulario de clasificación (05_API.md §9.5 a §9.9, §10.13).
 *
 * Uno solo para las cinco: lo que cambia es el máximo de longitud y el campo
 * propio, que llegan en `config`.
 */
export function ClassificationForm({
  entidad,
  config,
  categorias,
  tiposDeTalle,
  sexos,
  onSubmit,
  onCancel,
  saving,
  submitError,
}) {
  const [values, setValues] = useState(() => toFormValues(entidad, sexos));
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);
  // El slug se deriva del nombre mientras el usuario no lo escriba a mano.
  const [slugManual, setSlugManual] = useState(Boolean(entidad?.slug));

  function aplicar(cambios) {
    const siguientes = { ...values, ...cambios };
    setValues(siguientes);
    if (tocado) setErrors(validate(siguientes, config, tiposDeTalle));
  }

  function cambiarNombre(evento) {
    const name = evento.target.value;
    aplicar(slugManual ? { name } : { name, slug: slugify(name) });
  }

  function cambiarSlug(evento) {
    setSlugManual(true);
    aplicar({ slug: evento.target.value });
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);

    const encontrados = validate(values, config, tiposDeTalle);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toPayload(values, config));
  }

  // v1.5.0 (`RN-15b`): ejemplo y ayuda del "Nombre", solo en el recurso
  // "Talles" — el talle es texto libre, sin restricción de formato.
  const pista = config.campoExtra === 'sizeType' ? sizeNameHint() : null;

  return (
    <form onSubmit={enviar} noValidate>
      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <label htmlFor="name" className="form-label">
            Nombre
          </label>
          <input
            id="name"
            className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            value={values.name}
            onChange={cambiarNombre}
            maxLength={config.maxLength}
            placeholder={pista?.placeholder}
            disabled={saving}
          />
          {errors.name ? (
            <p className="invalid-feedback mb-0">{errors.name}</p>
          ) : (
            pista && <p className="form-text mb-0">{pista.ayuda}</p>
          )}
        </div>

        <div className="col-12 col-lg-6">
          <label htmlFor="slug" className="form-label">
            Slug
          </label>
          <input
            id="slug"
            className={`form-control ${errors.slug ? 'is-invalid' : ''}`}
            value={values.slug}
            onChange={cambiarSlug}
            maxLength={config.maxLength}
            disabled={saving}
          />
          {errors.slug ? (
            <p className="invalid-feedback mb-0">{errors.slug}</p>
          ) : (
            <p className="form-text mb-0">
              Es el nombre que se usa en la dirección web para que los clientes y los buscadores
              encuentren esta página. Se completa solo a partir del Nombre; normalmente no hace
              falta tocarlo.{' '}
              {entidad?.slug && (
                <strong>
                  Si lo cambiás ahora, los enlaces que ya compartiste con ese slug van a dejar de
                  funcionar — y una vez guardado, no se puede reutilizar ni volver atrás.
                </strong>
              )}
            </p>
          )}
        </div>

        {config.esPiezaDePortada && (
          <>
            <div className="col-12 col-lg-6">
              <label htmlFor="tagline" className="form-label">
                Frase de portada <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <input
                id="tagline"
                className={`form-control ${errors.tagline ? 'is-invalid' : ''}`}
                value={values.tagline}
                onChange={(evento) => aplicar({ tagline: evento.target.value })}
                placeholder="Innovación y rendimiento desde siempre"
                disabled={saving}
              />
              <p className="form-text">Acompaña al logotipo en el bloque de la portada.</p>
              {errors.tagline && <p className="text-danger small mt-1 mb-0">{errors.tagline}</p>}
            </div>

            <div className="col-12 col-lg-6">
              <label htmlFor="home_position" className="form-label">
                Orden en la portada <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <input
                id="home_position"
                type="number"
                min="0"
                step="1"
                className={`form-control ${errors.home_position ? 'is-invalid' : ''}`}
                value={values.home_position}
                onChange={(evento) => aplicar({ home_position: evento.target.value })}
                disabled={saving}
              />
              <p className="form-text">
                Dejalo vacío para que la marca no tenga bloque propio en la portada. El 0 es la
                primera.
              </p>
              {errors.home_position && (
                <p className="text-danger small mt-1 mb-0">{errors.home_position}</p>
              )}
            </div>

            <div className="col-12">
              <div className="form-check">
                <input
                  id="show_in_strip"
                  type="checkbox"
                  className="form-check-input"
                  checked={values.show_in_strip}
                  onChange={(evento) => aplicar({ show_in_strip: evento.target.checked })}
                  disabled={saving}
                />
                <label htmlFor="show_in_strip" className="form-check-label">
                  Mostrar en la franja de marcas
                </label>
              </div>
              <p className="form-text">
                La tira deslizante de logos que va debajo del menú. Aparece en todas las páginas de
                la tienda, no solo en la portada. Es independiente del bloque propio de arriba.
              </p>
            </div>
          </>
        )}

        {config.campoExtra === 'parent' && (
          <div className="col-12 col-lg-6">
            <label htmlFor="parent_id" className="form-label">
              Categoría padre <span className="text-muted fw-normal">(opcional)</span>
            </label>
            <select
              id="parent_id"
              className="form-select"
              value={values.parent_id}
              onChange={(evento) => aplicar({ parent_id: evento.target.value })}
              disabled={saving}
            >
              <option value="">Ninguna (categoría raíz)</option>
              {parentOptions(categorias, entidad?.id).map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.name}
                </option>
              ))}
            </select>
            {/* `AD-24`: la jerarquía admite dos niveles, no más. */}
            <p className="form-text mb-0">Sólo se admiten dos niveles: raíz y subcategoría.</p>
          </div>
        )}

        {/* `RN-83`: los sexos deciden en qué menús aparece la categoría. */}
        {config.tieneSexos && (
          <div className="col-12">
            <p className="form-label mb-2">Sexos de esta categoría</p>
            <div className="d-flex flex-wrap gap-3">
              {(sexos ?? []).map((sexo) => (
                <div className="form-check" key={sexo.id}>
                  <input
                    id={`gender-${sexo.id}`}
                    type="checkbox"
                    className="form-check-input"
                    checked={values.gender_ids.includes(String(sexo.id))}
                    onChange={() =>
                      aplicar({ gender_ids: toggleGender(values.gender_ids, sexo.id) })
                    }
                    disabled={saving}
                  />
                  <label htmlFor={`gender-${sexo.id}`} className="form-check-label">
                    {translateGender(sexo.slug)}
                  </label>
                </div>
              ))}
            </div>
            <p className="form-text mb-0">
              Decide en qué menús de la tienda aparece esta categoría: Hombres muestra las de
              Hombre o Unisex, Mujeres las de Mujer o Unisex, e Infantil las de Niño o Niña.
              También ordena el filtro de categorías del catálogo.{' '}
              <strong>Si no tildás ninguno, la categoría aparece en todos los menús.</strong>
            </p>
          </div>
        )}

        {config.campoExtra === 'sizeType' && (
          <div className="col-12 col-lg-6">
            <label htmlFor="size_type_id" className="form-label">
              Tipo de talle
            </label>
            <select
              id="size_type_id"
              className={`form-select ${errors.size_type_id ? 'is-invalid' : ''}`}
              value={values.size_type_id}
              onChange={(evento) => aplicar({ size_type_id: evento.target.value })}
              disabled={saving}
            >
              <option value="">Elegir…</option>
              {(tiposDeTalle ?? []).map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {translateSizeType(tipo.slug)}
                </option>
              ))}
            </select>
            {errors.size_type_id && <p className="invalid-feedback mb-0">{errors.size_type_id}</p>}
          </div>
        )}

        <div className="col-12">
          <div className="form-check form-switch">
            <input
              id="is_active"
              type="checkbox"
              className="form-check-input"
              checked={values.is_active}
              onChange={(evento) => aplicar({ is_active: evento.target.checked })}
              disabled={saving}
            />
            <label htmlFor="is_active" className="form-check-label">
              Activo
            </label>
          </div>
          <p className="form-text mb-0">
            Lo inactivo no se ofrece en el catálogo ni al crear productos.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="alert alert-danger py-2 small mt-3" role="alert">
          {mensajeDeGuardado(submitError, config)}
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
function mensajeDeGuardado(error, config) {
  if (error?.status === 429) return RATE_LIMIT_MESSAGE;
  if (error?.status === 409) {
    // `RN-79`: el slug no se reutiliza.
    return 'Ese slug ya está en uso. Probá con otro.';
  }
  if (error?.status === 422) {
    const campos = error.errors?.map((item) => item.field).filter(Boolean) ?? [];
    return campos.length > 0
      ? `Revisá estos campos: ${campos.join(', ')}.`
      : 'Algún dato no es válido.';
  }
  if (error?.status === 404) return `${config.singular} ya no existe.`;
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar. Intentá de nuevo.';
}
