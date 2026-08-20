import { useMemo, useState } from 'react';

import { translateGender, translateSizeType } from '../../../../shared/config/labels.js';
import {
  expectedVariantCount,
  MAX_NAME_LENGTH,
  MAX_SKU_LENGTH,
  toFormValues,
  toPayload,
  validate,
} from '../utils/productForm.js';

/**
 * Formulario de producto (05_API.md §9.3, §10.4).
 *
 * Los campos son exactamente los que acepta `_product_fields` más las cuatro
 * relaciones. `gender_id` y `size_type_id` salen de §9.17 y §9.18: no hay
 * identificadores fijos en el código.
 *
 * Una sola columna en móvil; las clases `col-lg-*` parten la fila recién a
 * partir de escritorio.
 */
export function ProductForm({ product, opciones, onSubmit, onCancel, saving, submitError }) {
  const [values, setValues] = useState(() => toFormValues(product));
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);

  function aplicar(cambios) {
    const siguientes = { ...values, ...cambios };
    setValues(siguientes);
    if (tocado) setErrors(validate(siguientes));
  }

  function cambiar(campo) {
    return (evento) => {
      const valor = evento.target.type === 'checkbox' ? evento.target.checked : evento.target.value;
      aplicar({ [campo]: valor });
    };
  }

  function alternar(campo, id) {
    const actuales = values[campo] ?? [];
    const siguiente = actuales.includes(id)
      ? actuales.filter((item) => item !== id)
      : [...actuales, id];
    aplicar({ [campo]: siguiente });
  }

  /**
   * `RN-15`: un talle pertenece a un tipo de talle. Ofrecer los de otro tipo
   * dejaría crear un producto de calzado con talles de indumentaria.
   */
  const tallesDelTipo = useMemo(() => {
    if (!values.size_type_id) return [];
    return (opciones.sizes ?? []).filter(
      (talle) => String(talle.size_type_id) === String(values.size_type_id),
    );
  }, [opciones.sizes, values.size_type_id]);

  const variantesPrevistas = expectedVariantCount(values);

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
      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Identificación</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <Campo id="name" etiqueta="Nombre" error={errors.name} className="col-12 col-lg-6">
              <input
                id="name"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                value={values.name}
                onChange={cambiar('name')}
                maxLength={MAX_NAME_LENGTH}
                disabled={saving}
              />
            </Campo>

            <Campo id="sku" etiqueta="SKU" error={errors.sku} className="col-12 col-lg-3">
              <input
                id="sku"
                className={`form-control ${errors.sku ? 'is-invalid' : ''}`}
                value={values.sku}
                onChange={cambiar('sku')}
                maxLength={MAX_SKU_LENGTH}
                disabled={saving}
              />
            </Campo>

            <Campo id="description" etiqueta="Descripción" opcional className="col-12">
              <textarea
                id="description"
                className="form-control"
                rows={3}
                value={values.description}
                onChange={cambiar('description')}
                disabled={saving}
              />
            </Campo>
          </div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Precio</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <Campo
              id="list_price"
              etiqueta="Precio de lista"
              error={errors.list_price}
              ayuda="En guaraníes, sin decimales."
              className="col-12 col-lg-6"
            >
              <input
                id="list_price"
                type="number"
                min={1}
                step={1}
                className={`form-control ${errors.list_price ? 'is-invalid' : ''}`}
                value={values.list_price}
                onChange={cambiar('list_price')}
                disabled={saving}
              />
            </Campo>

            <Campo
              id="sale_price"
              etiqueta="Precio de oferta"
              opcional
              error={errors.sale_price}
              ayuda="Debe ser menor que el de lista."
              className="col-12 col-lg-6"
            >
              <input
                id="sale_price"
                type="number"
                min={1}
                step={1}
                className={`form-control ${errors.sale_price ? 'is-invalid' : ''}`}
                value={values.sale_price}
                onChange={cambiar('sale_price')}
                disabled={saving}
              />
            </Campo>

            <Campo id="sale_starts_at" etiqueta="Oferta desde" opcional className="col-12 col-lg-6">
              <input
                id="sale_starts_at"
                type="datetime-local"
                className="form-control"
                value={values.sale_starts_at}
                onChange={cambiar('sale_starts_at')}
                disabled={saving}
              />
            </Campo>

            <Campo
              id="sale_ends_at"
              etiqueta="Oferta hasta"
              opcional
              error={errors.sale_ends_at}
              className="col-12 col-lg-6"
            >
              <input
                id="sale_ends_at"
                type="datetime-local"
                className={`form-control ${errors.sale_ends_at ? 'is-invalid' : ''}`}
                value={values.sale_ends_at}
                onChange={cambiar('sale_ends_at')}
                disabled={saving}
              />
            </Campo>
          </div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Clasificación</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <Selector
              id="brand_id"
              etiqueta="Marca"
              error={errors.brand_id}
              valor={values.brand_id}
              opciones={opciones.brands}
              onChange={cambiar('brand_id')}
              disabled={saving}
            />
            <Selector
              id="primary_category_id"
              etiqueta="Categoría principal"
              error={errors.primary_category_id}
              valor={values.primary_category_id}
              opciones={opciones.categories}
              onChange={cambiar('primary_category_id')}
              disabled={saving}
            />
            <Selector
              id="gender_id"
              etiqueta="Sexo"
              error={errors.gender_id}
              valor={values.gender_id}
              opciones={opciones.genders}
              traducir={translateGender}
              onChange={cambiar('gender_id')}
              disabled={saving}
            />
            <Selector
              id="size_type_id"
              etiqueta="Tipo de talle"
              error={errors.size_type_id}
              valor={values.size_type_id}
              opciones={opciones.sizeTypes}
              traducir={translateSizeType}
              onChange={(evento) =>
                // Cambiar el tipo invalida los talles ya elegidos: pertenecen al
                // tipo anterior (`RN-15`).
                aplicar({ size_type_id: evento.target.value, size_ids: [] })
              }
              disabled={saving}
            />

            <div className="col-12">
              <GrupoCasillas
                etiqueta="Categorías adicionales"
                nombre="category_ids"
                opciones={opciones.categories}
                seleccionadas={values.category_ids}
                onToggle={alternar}
                disabled={saving}
                ayuda="La categoría principal se incluye sola."
              />
            </div>
            <div className="col-12">
              <GrupoCasillas
                etiqueta="Deportes"
                nombre="sport_ids"
                opciones={opciones.sports}
                seleccionadas={values.sport_ids}
                onToggle={alternar}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Talles</h2>
        </div>
        <div className="card-body">
          <GrupoCasillas
            etiqueta="Talles"
            nombre="size_ids"
            opciones={tallesDelTipo}
            seleccionadas={values.size_ids}
            onToggle={alternar}
            disabled={saving || !values.size_type_id}
            ayuda={
              values.size_type_id
                ? 'Sólo se ofrecen los del tipo de talle elegido.'
                : 'Elegí primero un tipo de talle.'
            }
          />

          {/* `AD-15`: la variante se materializa al guardar, no se crea a mano. */}
          <div className="alert alert-info py-2 small mt-3 mb-0" role="status">
            Al guardar se generarán <strong>{variantesPrevistas}</strong>{' '}
            {variantesPrevistas === 1 ? 'variante' : 'variantes'} a partir de los talles. No se
            crean ni editan de a una, y no llevan stock numérico.
          </div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Publicación</h2>
        </div>
        <div className="card-body d-flex flex-wrap gap-4">
          <Interruptor
            id="is_active"
            etiqueta="Activo"
            checked={values.is_active}
            onChange={cambiar('is_active')}
            disabled={saving}
          />
          <Interruptor
            id="is_featured"
            etiqueta="Destacado"
            checked={values.is_featured}
            onChange={cambiar('is_featured')}
            disabled={saving}
          />
          <Interruptor
            id="is_new"
            etiqueta="Nuevo"
            checked={values.is_new}
            onChange={cambiar('is_new')}
            disabled={saving}
          />
        </div>
      </section>

      {submitError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {mensajeDeGuardado(submitError)}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 position-sticky bottom-0 bg-body py-3 border-top">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar producto'}
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

export function Campo({ id, etiqueta, opcional, error, ayuda, className = 'col-12', children }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="form-label">
        {etiqueta} {opcional && <span className="text-muted fw-normal">(opcional)</span>}
      </label>
      {children}
      {error ? (
        <p className="invalid-feedback d-block mb-0">{error}</p>
      ) : (
        ayuda && <p className="form-text mb-0">{ayuda}</p>
      )}
    </div>
  );
}

/** `traducir(slug)`: solo lo usan Sexo y Tipo de talle, presentación en español. */
export function Selector({ id, etiqueta, valor, opciones, error, onChange, disabled, traducir }) {
  return (
    <Campo id={id} etiqueta={etiqueta} error={error} className="col-12 col-lg-3">
      <select
        id={id}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        value={valor}
        onChange={onChange}
        disabled={disabled}
      >
        <option value="">Elegir…</option>
        {(opciones ?? []).map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {traducir ? traducir(opcion.slug) : opcion.name}
          </option>
        ))}
      </select>
    </Campo>
  );
}

/** Selección múltiple sin librerías: casillas dentro de un `fieldset`. */
export function GrupoCasillas({ etiqueta, nombre, opciones, seleccionadas, onToggle, disabled, ayuda }) {
  const items = opciones ?? [];

  return (
    <fieldset disabled={disabled}>
      <legend className="form-label fs-6">{etiqueta}</legend>
      {items.length === 0 ? (
        <p className="form-text mb-0">{ayuda ?? 'No hay opciones disponibles.'}</p>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-3">
            {items.map((opcion) => (
              <div className="form-check" key={opcion.id}>
                <input
                  type="checkbox"
                  className="form-check-input"
                  id={`${nombre}-${opcion.id}`}
                  checked={(seleccionadas ?? []).includes(opcion.id)}
                  onChange={() => onToggle(nombre, opcion.id)}
                />
                <label className="form-check-label" htmlFor={`${nombre}-${opcion.id}`}>
                  {opcion.name}
                </label>
              </div>
            ))}
          </div>
          {ayuda && <p className="form-text mb-0">{ayuda}</p>}
        </>
      )}
    </fieldset>
  );
}

export function Interruptor({ id, etiqueta, checked, onChange, disabled }) {
  return (
    <div className="form-check form-switch">
      <input
        id={id}
        type="checkbox"
        className="form-check-input"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={id} className="form-check-label">
        {etiqueta}
      </label>
    </div>
  );
}

/** Traduce el código del contrato, nunca el mensaje del servidor (`ERR-04`). */
export function mensajeDeGuardado(error) {
  if (error?.status === 422) {
    const campos = error.errors?.map((item) => item.field).filter(Boolean) ?? [];
    return campos.length > 0
      ? `Revisá estos campos: ${campos.join(', ')}.`
      : 'Algún dato no es válido.';
  }
  if (error?.status === 409) return 'Ya existe un producto con ese SKU o slug.';
  if (error?.status === 400) return 'Faltan campos obligatorios.';
  if (error?.status === 404) return 'El producto ya no existe.';
  if (error?.isNetworkFailure) return 'No pudimos conectar con el servidor.';
  return 'No pudimos guardar el producto. Intentá de nuevo.';
}
