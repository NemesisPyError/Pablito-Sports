import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { translateGender, translateSizeType } from '../../../../shared/config/labels.js';
import { formatGuaranies } from '../../../../shared/formatters/currency.js';
import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import { adminProductsApi } from '../api/productsApi.js';
import { DASHBOARD_KEY } from '../../dashboard/hooks/useDashboard.js';
import { ADMIN_PRODUCTS_KEY } from '../hooks/useAdminProducts.js';
import { ADMIN_PRODUCT_KEY } from '../hooks/useProductActions.js';
import { PRODUCT_IMAGES_KEY, PRODUCT_VARIANTS_KEY } from '../hooks/useProductMedia.js';
import {
  expectedVariantCount,
  MAX_DISCOUNT,
  MAX_NAME_LENGTH,
  MIN_DISCOUNT,
  parsedQuantity,
  precioConDescuento,
  toFormValues,
  toPayload,
  toTitleCase,
  validate,
} from '../utils/productForm.js';
import { ImagesSection } from './ImagesSection.jsx';
import { PendingImagesField } from './PendingImagesField.jsx';

/**
 * Formulario único de producto — alta y edición (05_API.md §9.3, §10.4,
 * 07_PANEL_ADMIN.md §14.3).
 *
 * Hasta v2.9.1 existían dos formularios distintos: `QuickAddProductForm`
 * (alta, campos reducidos, imágenes en cola) y este mismo componente, pero
 * solo para editar (sin imágenes ni cantidad por talle — eso vivía aparte,
 * en la ficha de solo lectura). Pedido explícito del usuario, 2026-08-24:
 * un solo formulario para los dos modos, mismos campos, mismo orden, mismas
 * validaciones. La única diferencia es el modo: `product` nulo es alta
 * (formulario vacío, con valores iniciales) y con dato es edición (formulario
 * cargado).
 *
 * Imágenes y cantidad por talle ahora se cargan **desde acá** en los dos
 * modos, sin tener que entrar a "Ver" después de crear. La ficha de detalle
 * (`ProductDetailPage`) conserva su propia gestión completa (reordenar,
 * marcar principal, registrar venta, eliminar variante): son acciones
 * operativas sobre un producto que ya existe, no datos de este formulario.
 *
 * El alta sigue sin navegar al guardar (pedido explícito del administrador,
 * 2026-08-16): limpia el formulario y queda lista para el siguiente
 * producto. Editar sí navega — eso lo decide `ProductFormPage` con `onSaved`.
 */
export function ProductForm({ product, opciones, onSubmit, onSaved, onCancel, saving, submitError }) {
  const esEdicion = Boolean(product);

  const [values, setValues] = useState(() => toFormValues(product));
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);
  const [pendingImages, setPendingImages] = useState([]);
  const [imagenesFallidas, setImagenesFallidas] = useState([]);
  const [subiendoImagenes, setSubiendoImagenes] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);

  const queryClient = useQueryClient();

  // `GrupoCasillas` solo sabe mostrar `opcion.name`; acá se traduce una vez,
  // en vez de sumarle un prop `traducir` que ningún otro grupo de casillas
  // necesita (categorías/deportes/talles ya vienen en español).
  const generosTraducidos = useMemo(
    () => (opciones.genders ?? []).map((g) => ({ ...g, name: translateGender(g.slug) })),
    [opciones.genders],
  );

  /**
   * "Categorías adicionales" no ofrece la principal (pedido explícito del
   * usuario): ya se incluye sola (§10.4), tildarla también acá solo
   * invitaba a una selección redundante. Cambia con `primary_category_id`,
   * no con `category_ids`: no hace falta recalcular en cada tilde.
   */
  const categoriasAdicionalesDisponibles = useMemo(
    () =>
      (opciones.categories ?? []).filter(
        (categoria) => String(categoria.id) !== String(values.primary_category_id),
      ),
    [opciones.categories, values.primary_category_id],
  );

  /*
   * Precio que resulta del descuento. Se recalcula también cuando cambia el
   * precio de lista: el porcentaje es el dato que el usuario fija, el precio es
   * su consecuencia, y mostrarlo desactualizado sería peor que no mostrarlo.
   */
  const precioOferta = precioConDescuento(values.list_price, values.discount_percentage);

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

  function cambiarCantidad(sizeId, valor) {
    aplicar({ size_quantities: { ...values.size_quantities, [String(sizeId)]: valor } });
  }

  /** `RN-15`: un talle pertenece a un tipo de talle. */
  const tallesDelTipo = useMemo(() => {
    if (!values.size_type_id) return [];
    return (opciones.sizes ?? []).filter(
      (talle) => String(talle.size_type_id) === String(values.size_type_id),
    );
  }, [opciones.sizes, values.size_type_id]);

  const variantesPrevistas = expectedVariantCount(values);

  /**
   * Sube en serie los archivos elegidos antes de que el producto existiera.
   *
   * De a uno y no en paralelo: la primera imagen subida se marca principal
   * automáticamente, y dos subidas concurrentes contra un producto sin
   * imágenes compiten por ser "la primera" (`UniqueViolation` confirmado en
   * la práctica). Un archivo rechazado no arrastra a los demás.
   */
  async function subirPendientes(idProducto, archivos) {
    setSubiendoImagenes(true);
    const fallidos = [];
    const archivosFallidos = [];

    for (const archivo of archivos) {
      try {
        await adminProductsApi.uploadImage(idProducto, { file: archivo });
      } catch (error) {
        fallidos.push({ nombre: archivo.name, error });
        archivosFallidos.push(archivo);
      }
    }

    setSubiendoImagenes(false);
    setImagenesFallidas(fallidos);
    setPendingImages(archivosFallidos);
    return archivosFallidos.length === 0;
  }

  /**
   * Iguala la cantidad real de cada variante con lo tipeado en "Talles y
   * stock". La variante y su `id` recién existen después de guardar
   * (`AD-15`): por eso este paso corre después, contra lo que devolvió el
   * `POST`/`PUT`, igual en alta que en edición. Si la cantidad no cambió, no
   * dispara una petición de más.
   */
  async function reconciliarCantidades(idProducto, guardado) {
    const variantesPorTalle = new Map(
      (guardado.variants ?? []).filter((v) => v.size?.id != null).map((v) => [v.size.id, v]),
    );

    for (const sizeId of values.size_ids ?? []) {
      const variante = variantesPorTalle.get(Number(sizeId));
      if (!variante) continue;
      const deseada = parsedQuantity(values, sizeId);
      if (deseada === variante.quantity) continue;
      await adminProductsApi.updateVariantQuantity(idProducto, variante.id, deseada);
    }

    queryClient.invalidateQueries({ queryKey: PRODUCT_VARIANTS_KEY(idProducto) });
  }

  function enviar(evento) {
    evento.preventDefault();
    setTocado(true);

    const encontrados = validate(values);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toPayload(values), {
      onSuccess: async (guardado) => {
        const idProducto = guardado.id;

        await reconciliarCantidades(idProducto, guardado);
        if (pendingImages.length > 0) await subirPendientes(idProducto, pendingImages);

        queryClient.invalidateQueries({ queryKey: PRODUCT_IMAGES_KEY(idProducto) });
        queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(idProducto) });
        queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
        queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });

        if (esEdicion) {
          onSaved(guardado, { isCreate: false });
          return;
        }

        // Alta: no navega, queda lista para el siguiente producto (pedido
        // del administrador, 2026-08-16).
        setUltimoGuardado(values.name.trim());
        setValues(toFormValues(null));
        setErrors({});
        setTocado(false);
        setPendingImages([]);
        setImagenesFallidas([]);
        onSaved(guardado, { isCreate: true });
      },
    });
  }

  return (
    <form onSubmit={enviar} noValidate>
      {ultimoGuardado && !submitError && (
        <div className="alert alert-success py-2 small" role="status">
          «{ultimoGuardado}» se agregó. Listo para cargar el siguiente producto.
        </div>
      )}

      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Identificación</h2>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <Campo id="name" etiqueta="Nombre" error={errors.name} className="col-12">
              <input
                id="name"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                value={values.name}
                onChange={cambiar('name')}
                // Formato título automático (pedido explícito del usuario):
                // "nike air" -> "Nike Air". Al perder el foco, no en cada
                // tecla, para no pelear con lo que el administrador está
                // escribiendo.
                onBlur={() => aplicar({ name: toTitleCase(values.name) })}
                maxLength={MAX_NAME_LENGTH}
                disabled={saving}
                autoFocus={!esEdicion}
              />
            </Campo>

            {/* v2.9.10 (pedido explícito del usuario): el SKU deja de
                mostrarse y de poder editarse — el administrador no debe ver
                ni tocar este dato. `values.sku` sigue viajando en el estado
                del formulario sin campo propio: en alta llega vacío desde
                `VACIO` y `toPayload` lo autogenera (`generarSku`); en
                edición, `toFormValues` lo precarga con el valor ya existente
                del producto y, al no haber input que lo cambie, se reenvía
                intacto. El backend lo sigue exigiendo — no se tocó nada ahí. */}

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
              id="discount_percentage"
              etiqueta="Descuento (%)"
              opcional
              error={errors.discount_percentage}
              ayuda={
                precioOferta
                  ? `Precio de oferta: ${formatGuaranies(Number(precioOferta))}`
                  : `De ${MIN_DISCOUNT} a ${MAX_DISCOUNT}. Dejalo vacío si no tiene oferta.`
              }
              className="col-12 col-lg-6"
            >
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
              onChange={(evento) => {
                // La nueva principal se saca de "adicionales" si ya estaba
                // tildada ahí (pedido explícito del usuario): se incluye
                // sola, no debe quedar duplicada ni como resto de una
                // selección anterior al cambiar de categoría principal varias
                // veces.
                const nuevaPrincipal = Number(evento.target.value);
                aplicar({
                  primary_category_id: evento.target.value,
                  category_ids: values.category_ids.filter((id) => id !== nuevaPrincipal),
                });
              }}
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
                aplicar({ size_type_id: evento.target.value, size_ids: [], size_quantities: {} })
              }
              disabled={saving}
            />

            <div className="col-12">
              <GrupoCasillas
                etiqueta="Sexo"
                nombre="gender_ids"
                opciones={generosTraducidos}
                seleccionadas={values.gender_ids}
                onToggle={alternar}
                disabled={saving}
                error={errors.gender_ids}
                ayuda="Un producto puede ser de varios sexos a la vez."
              />
            </div>
            <div className="col-12">
              <GrupoCasillas
                etiqueta="Categorías adicionales"
                nombre="category_ids"
                // La categoría principal no se ofrece acá (pedido explícito
                // del usuario): ya se incluye sola, mostrarla también en
                // "adicionales" invitaba a tildarla dos veces. Ninguna
                // categoría se toca en la base — es solo qué opciones se
                // listan en este selector.
                opciones={categoriasAdicionalesDisponibles}
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
          <h2 className="h6 mb-0">Talles y stock</h2>
        </div>
        <div className="card-body">
          <TallesConStock
            opciones={tallesDelTipo}
            seleccionadas={values.size_ids}
            cantidades={values.size_quantities}
            onToggle={(id) => alternar('size_ids', id)}
            onCantidad={cambiarCantidad}
            disabled={saving || !values.size_type_id}
            ayuda={values.size_type_id ? undefined : 'Elegí primero un tipo de talle.'}
          />

          {/* `AD-15`: la variante se materializa al guardar, no se crea a mano. */}
          <div className="alert alert-info py-2 small mt-3 mb-0" role="status">
            Al guardar se {esEdicion ? 'reconciliarán' : 'generarán'}{' '}
            <strong>{variantesPrevistas}</strong>{' '}
            {variantesPrevistas === 1 ? 'variante' : 'variantes'} a partir de los talles, con la
            cantidad que hayas cargado acá (0 si se deja en blanco).
          </div>
        </div>
      </section>

      <section className="card mb-3">
        <div className="card-header bg-white">
          <h2 className="h6 mb-0">Imágenes</h2>
        </div>
        <div className="card-body">
          {esEdicion ? (
            // Editando ya hay `productId`: la galería real (subir, reordenar,
            // marcar principal, eliminar) sube al toque, sin esperar a
            // "Guardar producto".
            <ImagesSection productId={product.id} />
          ) : (
            <PendingImagesField
              files={pendingImages}
              onChange={setPendingImages}
              disabled={saving || subiendoImagenes}
              fallidos={imagenesFallidas}
            />
          )}
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
        <button type="submit" className="btn btn-primary" disabled={saving || subiendoImagenes}>
          {saving ? 'Guardando…' : subiendoImagenes ? 'Subiendo imágenes…' : 'Guardar producto'}
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
export function GrupoCasillas({
  etiqueta,
  nombre,
  opciones,
  seleccionadas,
  onToggle,
  disabled,
  ayuda,
  error,
}) {
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
          {error ? (
            <p className="invalid-feedback d-block mb-0">{error}</p>
          ) : (
            ayuda && <p className="form-text mb-0">{ayuda}</p>
          )}
        </>
      )}
    </fieldset>
  );
}

/**
 * Talles con cantidad (v2.9.2, pedido explícito del usuario): mismas casillas
 * que `GrupoCasillas`, con un campo numérico junto a cada talle marcado. La
 * cantidad no se envía en `_product_fields` — la variante recién tiene `id`
 * después de guardar (`AD-15`) — así que solo se junta acá y se reconcilia
 * después del `POST`/`PUT`.
 */
function TallesConStock({ opciones, seleccionadas, cantidades, onToggle, onCantidad, disabled, ayuda }) {
  const items = opciones ?? [];

  return (
    <fieldset disabled={disabled}>
      <legend className="form-label fs-6">Talles</legend>
      {items.length === 0 ? (
        <p className="form-text mb-0">{ayuda ?? 'No hay talles disponibles.'}</p>
      ) : (
        <>
          <div className="d-flex flex-wrap gap-3">
            {items.map((talle) => {
              const marcado = (seleccionadas ?? []).includes(talle.id);
              return (
                <div className="form-check d-flex align-items-center gap-2" key={talle.id}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id={`size-${talle.id}`}
                    checked={marcado}
                    onChange={() => onToggle(talle.id)}
                  />
                  <label className="form-check-label" htmlFor={`size-${talle.id}`}>
                    {talle.name}
                  </label>
                  {marcado && (
                    <>
                      <label className="visually-hidden" htmlFor={`size-qty-${talle.id}`}>
                        Cantidad de {talle.name}
                      </label>
                      <input
                        id={`size-qty-${talle.id}`}
                        type="number"
                        min={0}
                        step={1}
                        className="form-control form-control-sm"
                        style={{ width: '4.5rem' }}
                        placeholder="0"
                        value={cantidades?.[String(talle.id)] ?? ''}
                        onChange={(evento) => onCantidad(talle.id, evento.target.value)}
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {ayuda && <p className="form-text mb-0 mt-1">{ayuda}</p>}
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
  if (error?.status === 429) return RATE_LIMIT_MESSAGE;
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
