import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { AutoResizeTextarea } from '../../settings/components/AutoResizeTextarea.jsx';
import { useUnsavedChangesWarning } from '../../settings/hooks/useUnsavedChangesWarning.js';
import {
  buildPreview,
  ITEM_VARIABLES,
  isDirty,
  MESSAGE_VARIABLES,
  toFormValues,
  toPayload,
  validate,
} from '../utils/whatsappTemplateForm.js';
import styles from './WhatsappTemplateForm.module.css';

/**
 * Editor de la plantilla de WhatsApp, con vista previa y restauración
 * (05_API.md §9.13, 07_PANEL_ADMIN.md §14.8, `RF-41`).
 */
export function WhatsappTemplateForm({
  template,
  storeName,
  onSubmit,
  onReset,
  saving,
  resetting,
  saved,
  submitError,
}) {
  const initialValues = useMemo(() => toFormValues(template), [template]);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);
  const [confirmandoReset, setConfirmandoReset] = useState(false);

  const sucio = isDirty(values, initialValues);
  const vistaPrevia = useMemo(() => buildPreview(values, storeName), [values, storeName]);

  useUnsavedChangesWarning(sucio && !saving);

  function aplicar(cambios) {
    const siguientes = { ...values, ...cambios };
    setValues(siguientes);
    if (tocado) setErrors(validate(siguientes));
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);

    const encontrados = validate(values);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toPayload(values));
  }

  async function confirmarReset() {
    try {
      // A diferencia de guardar, acá el dato nuevo (la plantilla por defecto)
      // no es el que ya está en `values`: hay que traerlo de la respuesta y
      // pisar el formulario a mano, o quedaría mostrando el texto editado
      // aunque el servidor ya haya restaurado el otro.
      const restaurado = await onReset();
      setValues(toFormValues(restaurado));
      setErrors({});
      setTocado(false);
      setConfirmandoReset(false);
    } catch {
      // El error queda en `submitError` (mutación de React Query); acá solo
      // se evita que una promesa rechazada quede sin manejar.
      setConfirmandoReset(false);
    }
  }

  return (
    <form onSubmit={enviar} noValidate>
      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <section className="card mb-3">
            <div className="card-body">
              <h2 className="h6 mb-3">Mensaje</h2>

              <label htmlFor="message_template" className="form-label">
                Plantilla del mensaje
              </label>
              <AutoResizeTextarea
                id="message_template"
                minRows={9}
                className={`font-monospace small ${errors.message_template ? 'is-invalid' : ''}`}
                value={values.message_template}
                onChange={(evento) => aplicar({ message_template: evento.target.value })}
                disabled={saving || resetting}
              />
              {errors.message_template && (
                <p className="invalid-feedback d-block">{errors.message_template}</p>
              )}

              <VariableList titulo="Variables disponibles" variables={MESSAGE_VARIABLES} />
            </div>
          </section>

          <section className="card mb-3">
            <div className="card-body">
              <h2 className="h6 mb-3">Ítem</h2>
              <p className="form-text mt-0 mb-2">
                Se repite una vez por producto del carrito y compone {'{{items}}'} arriba.
              </p>

              <label htmlFor="item_template" className="form-label">
                Plantilla de ítem
              </label>
              <AutoResizeTextarea
                id="item_template"
                minRows={5}
                className={`font-monospace small ${errors.item_template ? 'is-invalid' : ''}`}
                value={values.item_template}
                onChange={(evento) => aplicar({ item_template: evento.target.value })}
                disabled={saving || resetting}
              />
              {errors.item_template && (
                <p className="invalid-feedback d-block">{errors.item_template}</p>
              )}

              <VariableList titulo="Variables disponibles" variables={ITEM_VARIABLES} />
            </div>
          </section>
        </div>

        <div className="col-12 col-xl-6">
          <section className="card mb-3">
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h2 className="h6 mb-0">Vista previa</h2>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => setConfirmandoReset(true)}
                  disabled={saving || resetting}
                >
                  Restaurar plantilla por defecto
                </button>
              </div>
              <p className="form-text mt-0 mb-2">
                Con dos productos de ejemplo, uno de ellos sin talle cargado.
              </p>
              <pre className={`bg-light border rounded p-3 small mb-0 ${styles.preview}`}>
                {vistaPrevia}
              </pre>
            </div>
          </section>
        </div>
      </div>

      {submitError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {mensajeDeGuardado(submitError)}
        </div>
      )}

      <div className="d-flex flex-wrap align-items-center gap-3 position-sticky bottom-0 bg-body py-3 border-top">
        <button type="submit" className="btn btn-primary" disabled={saving || resetting || !sucio}>
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>

        <Link to="/admin/settings" className="btn btn-outline-secondary">
          Volver a Configuración
        </Link>

        <span className="small" role="status" aria-live="polite">
          {saving ? (
            <span className="text-muted">Guardando…</span>
          ) : resetting ? (
            <span className="text-muted">Restaurando…</span>
          ) : sucio ? (
            <span className="text-warning-emphasis">Tenés cambios sin guardar.</span>
          ) : saved ? (
            <span className="text-success">Cambios guardados.</span>
          ) : null}
        </span>
      </div>

      <ConfirmDialog
        isOpen={confirmandoReset}
        title="Restaurar plantilla por defecto"
        message="Se reemplazan las dos plantillas por las que trae el sistema. Los cambios que no guardaste se pierden."
        confirmLabel="Restaurar"
        variant="danger"
        busy={resetting}
        onConfirm={confirmarReset}
        onCancel={() => setConfirmandoReset(false)}
      />
    </form>
  );
}

function VariableList({ titulo, variables }) {
  return (
    <div className="mt-2">
      <p className="form-text mb-1">{titulo}</p>
      <ul className="list-inline mb-0">
        {variables.map((variable) => (
          <li className="list-inline-item mb-1" key={variable.name}>
            <code className="bg-light border rounded px-1">{`{{${variable.name}}}`}</code>
            {variable.required && <span className="text-danger"> *</span>}
          </li>
        ))}
      </ul>
    </div>
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
  return 'No pudimos guardar la plantilla. Intentá de nuevo.';
}
