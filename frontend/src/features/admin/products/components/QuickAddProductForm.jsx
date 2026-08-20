import { useMemo, useState } from 'react';

import { translateGender, translateSizeType } from '../../../../shared/config/labels.js';
import { adminProductsApi } from '../api/productsApi.js';
import { QUICK_VACIO, toQuickPayload, validateQuick } from '../utils/productForm.js';
import { Campo, GrupoCasillas, Interruptor, mensajeDeGuardado, Selector } from './ProductForm.jsx';
import { PendingImagesField } from './PendingImagesField.jsx';

/**
 * Alta rápida de productos, para cargar el catálogo en serie desde el
 * listado (pedido del administrador, 2026-08-16): solo nombre, precio,
 * marca, categoría, sexo, tipo de talle, imágenes y publicación.
 *
 * El resto de `_product_fields` (SKU, slug, descripción, categorías
 * adicionales, deportes, destacado, nuevo) sigue existiendo en el modelo —
 * se completa con valores neutros en {@link toQuickPayload} — y se ajusta,
 * si hace falta, editando el producto desde el listado. Las ofertas se
 * cargan aparte, desde Promociones (`RN-36`): por eso acá no hay precio de
 * oferta.
 *
 * `RN-38b` (v1.4.0): la disponibilidad tampoco se elige acá — el producto
 * nace sin stock y la cantidad se carga por variante desde su ficha, una
 * vez creado.
 *
 * Al guardar no navega: limpia el formulario y queda listo para el
 * siguiente producto, con un aviso de lo último guardado.
 *
 * Las imágenes elegidas (pedido del administrador, 2026-08-19: cargarlas en
 * el mismo paso, no después) se suben recién cuando el producto ya tiene
 * `id` — el backend no acepta archivos en la misma petición de alta
 * (`POST /admin/products` es JSON puro). Si alguna falla, el producto igual
 * queda creado: no se pierde por un archivo que no subió.
 */
export function QuickAddProductForm({ opciones, onSubmit, saving, submitError }) {
  const [values, setValues] = useState(() => ({ ...QUICK_VACIO }));
  const [errors, setErrors] = useState({});
  const [tocado, setTocado] = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);
  const [imagenesFallidas, setImagenesFallidas] = useState([]);
  const [productoEnCurso, setProductoEnCurso] = useState(null);
  const [subiendoImagenes, setSubiendoImagenes] = useState(false);

  function aplicar(cambios) {
    const siguientes = { ...values, ...cambios };
    setValues(siguientes);
    if (tocado) setErrors(validateQuick(siguientes));
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
   * `pendingImages` puede traer archivos que ya fallaron para un producto
   * anterior (`productoEnCurso`). Si el administrador los saca todos a mano
   * en vez de reintentar, ya no hay nada pendiente de ese producto — hay que
   * soltar `productoEnCurso` acá, si no, el próximo alta exitosa le subiría
   * esos archivos (de otro producto) al producto nuevo.
   */
  function alCambiarPendientes(archivos) {
    setPendingImages(archivos);
    if (archivos.length === 0) {
      setImagenesFallidas([]);
      setProductoEnCurso(null);
    }
  }

  const tallesDelTipo = useMemo(() => {
    if (!values.size_type_id) return [];
    return (opciones.sizes ?? []).filter(
      (talle) => String(talle.size_type_id) === String(values.size_type_id),
    );
  }, [opciones.sizes, values.size_type_id]);

  /**
   * Sube los archivos pendientes contra el producto ya creado, uno por uno.
   *
   * De a uno y no en paralelo: la primera imagen subida se marca principal
   * automáticamente (`admin_product_service.py::create_image`), y dos
   * subidas concurrentes contra un producto sin imágenes todavía compiten
   * por ser "la primera" — confirmado en la práctica, dispara
   * `UniqueViolation` en `uq_images_primary_per_product`. Secuencial lo
   * evita de raíz sin tocar el backend.
   *
   * Un archivo rechazado no debe arrastrar a los demás ni poner en duda al
   * producto, que ya existe — por eso se seguía con el resto igual.
   */
  async function subirImagenes(productId, archivos) {
    setSubiendoImagenes(true);
    const fallidos = [];
    const archivosFallidos = [];

    for (const archivo of archivos) {
      try {
        await adminProductsApi.uploadImage(productId, { file: archivo });
      } catch (error) {
        fallidos.push({ nombre: archivo.name, error });
        archivosFallidos.push(archivo);
      }
    }

    setSubiendoImagenes(false);

    if (archivosFallidos.length === 0) {
      setPendingImages([]);
      setImagenesFallidas([]);
      setProductoEnCurso(null);
    } else {
      setPendingImages(archivosFallidos);
      setImagenesFallidas(fallidos);
      setProductoEnCurso(productId);
    }
  }

  function enviar(evento) {
    evento.preventDefault();
    // Con una subida fallida sin resolver, esos archivos son de otro
    // producto (`productoEnCurso`): agregar uno nuevo ahora se los subiría
    // por error. Hay que reintentar o sacarlos antes de seguir.
    if (productoEnCurso) return;

    setTocado(true);

    const encontrados = validateQuick(values);
    setErrors(encontrados);
    if (Object.keys(encontrados).length > 0) return;

    onSubmit(toQuickPayload(values), {
      onSuccess: (creado) => {
        setUltimoGuardado(values.name.trim());
        setValues({ ...QUICK_VACIO });
        setErrors({});
        setTocado(false);

        if (pendingImages.length > 0) {
          subirImagenes(creado.id, pendingImages);
        }
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
        <div className="card-body">
          <div className="row g-3">
            <Campo id="name" etiqueta="Nombre" error={errors.name} className="col-12 col-lg-8">
              <input
                id="name"
                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                value={values.name}
                onChange={cambiar('name')}
                disabled={saving}
                autoFocus
              />
            </Campo>

            <Campo
              id="list_price"
              etiqueta="Precio"
              error={errors.list_price}
              ayuda="En guaraníes, sin decimales."
              className="col-12 col-lg-4"
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
              etiqueta="Categoría"
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
              onChange={(evento) => aplicar({ size_type_id: evento.target.value, size_ids: [] })}
              disabled={saving}
            />

            <div className="col-12">
              <GrupoCasillas
                etiqueta="Talles"
                nombre="size_ids"
                opciones={tallesDelTipo}
                seleccionadas={values.size_ids}
                onToggle={alternar}
                disabled={saving || !values.size_type_id}
                ayuda={values.size_type_id ? undefined : 'Elegí primero un tipo de talle.'}
              />
            </div>

            <div className="col-12">
              <PendingImagesField
                files={pendingImages}
                onChange={alCambiarPendientes}
                disabled={saving || subiendoImagenes}
                fallidos={imagenesFallidas}
              />
              {productoEnCurso && imagenesFallidas.length > 0 && (
                <button
                  type="button"
                  className="btn btn-outline-warning btn-sm mt-2"
                  onClick={() => subirImagenes(productoEnCurso, pendingImages)}
                  disabled={subiendoImagenes}
                >
                  {subiendoImagenes ? 'Reintentando…' : 'Reintentar subida'}
                </button>
              )}
            </div>

            <div className="col-12">
              <Interruptor
                id="is_active"
                etiqueta="Publicado"
                checked={values.is_active}
                onChange={cambiar('is_active')}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </section>

      {submitError && (
        <div className="alert alert-danger py-2 small" role="alert">
          {mensajeDeGuardado(submitError)}
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 position-sticky bottom-0 bg-body py-3 border-top">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={saving || subiendoImagenes || Boolean(productoEnCurso)}
        >
          {saving ? 'Guardando…' : subiendoImagenes ? 'Subiendo imágenes…' : 'Agregar producto'}
        </button>
        {productoEnCurso && !subiendoImagenes && (
          <span className="align-self-center small text-muted">
            Reintentá o sacá las imágenes pendientes para seguir cargando productos.
          </span>
        )}
      </div>
    </form>
  );
}
