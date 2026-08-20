import { useMemo, useState } from 'react';

import { AutoResizeTextarea } from './AutoResizeTextarea.jsx';
import { SocialLinksField } from './SocialLinksField.jsx';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning.js';
import { StoreAboutImageField } from './StoreAboutImageField.jsx';
import {
  isDirty,
  MAX_ABOUT_TITLE_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_STORE_NAME_LENGTH,
  MAX_WHATSAPP_LENGTH,
  toFormValues,
  toPayload,
  validate,
} from '../utils/settingsForm.js';

// §14.7 no lista las plantillas entre los campos de esta pantalla.
const VALIDACION = { includeTemplates: false };

/**
 * Formulario de configuración (05_API.md §9.12, 07_PANEL_ADMIN.md §14.7).
 *
 * Los campos son exactamente los de `StoreSettingsAdminUpdateDTO`. La
 * validación replica lo que el backend ya exige; el servidor sigue decidiendo.
 *
 * En móvil es de una sola columna: las clases `col-lg-*` parten la fila recién
 * a partir de escritorio, y las plantillas ocupan el ancho completo en todos
 * los tamaños porque son texto multilínea.
 */
export function StoreSettingsForm({ settings, onSubmit, saving, saved, submitError }) {
  const initialValues = useMemo(() => toFormValues(settings), [settings]);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  const sucio = isDirty(values, initialValues);
  // La foto no forma parte del formulario: se guarda por su propio recurso y
  // por eso su URL se lee del DTO, no del estado editable.
  const aboutImageUrl = settings?.about_image_url ?? null;

  // Recargar o cerrar la pestaña con cambios pendientes pide confirmación.
  useUnsavedChangesWarning(sucio && !saving);

  function aplicar(cambios) {
    const siguientes = { ...values, ...cambios };
    setValues(siguientes);
    // Revalidar en caliente solo después del primer intento: avisar mientras
    // todavía está escribiendo el primer carácter es ruido.
    if (tocado) setErrors(validate(siguientes, VALIDACION));
  }

  function cambiar(campo) {
    return (evento) => aplicar({ [campo]: evento.target.value });
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);

    const encontrados = validate(values, VALIDACION);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toPayload(values));
  }

  return (
    <form onSubmit={enviar} noValidate>
      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Datos de la tienda</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label htmlFor="store_name" className="form-label">
                Nombre de la tienda
              </label>
              <input
                id="store_name"
                className={`form-control ${errors.store_name ? 'is-invalid' : ''}`}
                value={values.store_name}
                onChange={cambiar('store_name')}
                maxLength={MAX_STORE_NAME_LENGTH}
                disabled={saving}
              />
              {errors.store_name && <p className="invalid-feedback mb-0">{errors.store_name}</p>}
            </div>

            <div className="col-12 col-lg-6">
              <label htmlFor="whatsapp_number" className="form-label">
                Número de WhatsApp
              </label>
              <input
                id="whatsapp_number"
                className={`form-control ${errors.whatsapp_number ? 'is-invalid' : ''}`}
                value={values.whatsapp_number}
                onChange={cambiar('whatsapp_number')}
                maxLength={MAX_WHATSAPP_LENGTH}
                disabled={saving}
              />
              {errors.whatsapp_number ? (
                <p className="invalid-feedback mb-0">{errors.whatsapp_number}</p>
              ) : (
                // `RN-58`: es el número al que llegan las consultas del catálogo.
                <p className="form-text mb-0">A este número llegan las consultas.</p>
              )}
            </div>

            <div className="col-12 col-lg-6">
              <label htmlFor="email" className="form-label">
                Correo de contacto <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <input
                id="email"
                type="email"
                className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                value={values.email}
                onChange={cambiar('email')}
                maxLength={MAX_EMAIL_LENGTH}
                disabled={saving}
              />
              {errors.email ? (
                <p className="invalid-feedback mb-0">{errors.email}</p>
              ) : (
                <p className="form-text mb-0">Se muestra en el pie del catálogo.</p>
              )}
            </div>

            <div className="col-12 col-lg-6">
              <label htmlFor="address" className="form-label">
                Dirección <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <AutoResizeTextarea
                id="address"
                minRows={2}
                value={values.address}
                onChange={cambiar('address')}
                disabled={saving}
              />
            </div>

            <div className="col-12 col-lg-6">
              <label htmlFor="business_hours" className="form-label">
                Horarios <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <AutoResizeTextarea
                id="business_hours"
                minRows={2}
                value={values.business_hours}
                onChange={cambiar('business_hours')}
                disabled={saving}
              />
            </div>

            <div className="col-12 col-lg-4">
              <label htmlFor="featured_products_count" className="form-label">
                Productos destacados
              </label>
              <input
                id="featured_products_count"
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                className={`form-control ${errors.featured_products_count ? 'is-invalid' : ''}`}
                value={values.featured_products_count}
                onChange={cambiar('featured_products_count')}
                disabled={saving}
              />
              {errors.featured_products_count ? (
                <p className="invalid-feedback mb-0">{errors.featured_products_count}</p>
              ) : (
                <p className="form-text mb-0">Cuántos se muestran en la portada.</p>
              )}
            </div>

            <div className="col-12">
              <SocialLinksField
                rows={values.socialLinks}
                onChange={(socialLinks) => aplicar({ socialLinks })}
                errors={errors.socialLinks}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Contenido institucional (§9.12, v1.1.0). La foto viaja por su propio
          recurso: el `PUT` de esta pantalla es JSON y volverlo multipart
          obligaría a reenviar las plantillas en cada cambio de imagen. */}
      <section className="card mb-3">
        <div className="card-body">
          <h2 className="h6 mb-3">Nuestra historia</h2>

          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <label htmlFor="about_title" className="form-label">
                Título <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <input
                id="about_title"
                className={`form-control ${errors.about_title ? 'is-invalid' : ''}`}
                value={values.about_title}
                onChange={cambiar('about_title')}
                maxLength={MAX_ABOUT_TITLE_LENGTH}
                disabled={saving}
              />
              {errors.about_title ? (
                <p className="invalid-feedback mb-0">{errors.about_title}</p>
              ) : (
                <p className="form-text mb-0">Sin título, la sección no se publica.</p>
              )}
            </div>

            <div className="col-12">
              <label htmlFor="about_text" className="form-label">
                Texto <span className="text-muted fw-normal">(opcional)</span>
              </label>
              <AutoResizeTextarea
                id="about_text"
                minRows={4}
                value={values.about_text}
                onChange={cambiar('about_text')}
                disabled={saving}
              />
              <p className="form-text mb-0">Se muestra en la portada, junto a la foto.</p>
            </div>

            <div className="col-12">
              <StoreAboutImageField imageUrl={aboutImageUrl} disabled={saving} />
            </div>
          </div>
        </div>
      </section>

      {/* v1.6.0: la pantalla de plantilla de WhatsApp vuelve a estar fuera
          del panel (07_PANEL_ADMIN.md §7.1, §14.8) — no hay enlace acá para
          no dejar uno muerto. Las plantillas siguen viajando en el `PUT`, que
          reemplaza el recurso completo (§9.12), con el valor que trajo el
          DTO. */}

      {submitError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {mensajeDeGuardado(submitError)}
        </div>
      )}

      {/* La barra queda fija al pie: el formulario es largo y el botón de
          guardar no debería quedar fuera de la vista. */}
      <div className="d-flex flex-wrap align-items-center gap-3 position-sticky bottom-0 bg-body py-3 border-top">
        <button type="submit" className="btn btn-primary" disabled={saving || !sucio}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {/* `aria-live`: el resultado se anuncia sin robar el foco. */}
        <span className="small" role="status" aria-live="polite">
          {saving ? (
            <span className="text-muted">Guardando…</span>
          ) : sucio ? (
            <span className="text-warning-emphasis">Tenés cambios sin guardar.</span>
          ) : saved ? (
            <span className="text-success">Cambios guardados.</span>
          ) : null}
        </span>
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
  if (error?.status === 404) return 'La configuración todavía no fue inicializada.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar la configuración. Intentá de nuevo.';
}
