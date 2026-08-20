/**
 * Conversión entre el DTO y el formulario, y validación de entrada.
 *
 * Se separa de los componentes porque es lógica pura: así se puede probar sin
 * montar React, que es lo único que este proyecto puede testear hoy.
 *
 * La validación replica lo que el backend ya exige (`_product_fields` y
 * 04 §9.2.10). **No** añade reglas propias: el servidor sigue decidiendo.
 */

// 04 §9.2.10.
export const MAX_NAME_LENGTH = 255;
export const MAX_SKU_LENGTH = 100;

/** Igual que en promociones: el control trabaja en hora local y sin zona. */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

/** `AD-34`: las marcas se guardan como instantes absolutos. */
export function localInputToIso(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

const VACIO = {
  name: '',
  slug: '',
  sku: '',
  description: '',
  list_price: '',
  sale_price: '',
  sale_starts_at: '',
  sale_ends_at: '',
  is_active: true,
  is_featured: false,
  is_new: false,
  brand_id: '',
  primary_category_id: '',
  gender_id: '',
  size_type_id: '',
  category_ids: [],
  sport_ids: [],
  size_ids: [],
};

/**
 * Estado inicial a partir del detalle administrativo.
 *
 * El DTO de §9.3 devuelve las relaciones **con identificador**
 * (`gender: {id, name}`, `categories: [{id, name}]`), de modo que el formulario
 * las precarga directamente. `sale_price` es la columna del producto, no el
 * precio efectivo de una promoción: reenviarlo en el `PUT` no lo corrompe.
 */
export function toFormValues(product) {
  if (!product) return { ...VACIO };

  const ids = (lista) => (lista ?? []).map((item) => item.id);

  return {
    ...VACIO,
    name: product.name ?? '',
    slug: product.slug ?? '',
    sku: product.sku ?? '',
    description: product.description ?? '',
    list_price: product.list_price != null ? String(product.list_price) : '',
    sale_price: product.sale_price != null ? String(product.sale_price) : '',
    sale_starts_at: isoToLocalInput(product.sale_starts_at),
    sale_ends_at: isoToLocalInput(product.sale_ends_at),
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
    is_new: Boolean(product.is_new),
    brand_id: product.brand?.id != null ? String(product.brand.id) : '',
    primary_category_id:
      product.primary_category?.id != null ? String(product.primary_category.id) : '',
    gender_id: product.gender?.id != null ? String(product.gender.id) : '',
    size_type_id: product.size_type?.id != null ? String(product.size_type.id) : '',
    category_ids: ids(product.categories),
    sport_ids: ids(product.sports),
    size_ids: ids(product.sizes),
  };
}

function esEnteroPositivo(valor) {
  return /^\d+$/.test(String(valor ?? '').trim()) && Number.parseInt(valor, 10) > 0;
}

/** Valida el formulario. Devuelve `{ campo: mensaje }`, vacío si todo está bien. */
export function validate(values) {
  const errores = {};

  const nombre = values.name?.trim();
  if (!nombre) errores.name = 'El nombre es obligatorio.';
  else if (nombre.length > MAX_NAME_LENGTH) {
    errores.name = `No puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  const sku = values.sku?.trim();
  if (!sku) errores.sku = 'El SKU es obligatorio.';
  else if (sku.length > MAX_SKU_LENGTH) {
    errores.sku = `No puede superar los ${MAX_SKU_LENGTH} caracteres.`;
  }

  // 04 §9.2.10: `CHECK (list_price > 0)`.
  if (!values.list_price?.toString().trim()) {
    errores.list_price = 'El precio de lista es obligatorio.';
  } else if (!esEnteroPositivo(values.list_price)) {
    errores.list_price = 'Debe ser un número entero mayor que cero, en guaraníes.';
  }

  // 04 §9.2.10: `CHECK (sale_price IS NULL OR sale_price < list_price)`.
  const oferta = values.sale_price?.toString().trim();
  if (oferta) {
    if (!esEnteroPositivo(oferta)) {
      errores.sale_price = 'Debe ser un número entero mayor que cero.';
    } else if (
      esEnteroPositivo(values.list_price) &&
      Number.parseInt(oferta, 10) >= Number.parseInt(values.list_price, 10)
    ) {
      errores.sale_price = 'El precio de oferta debe ser menor que el de lista.';
    }
  }

  // 04 §9.2.10: `CHECK (sale_ends_at > sale_starts_at)`.
  if (values.sale_ends_at && values.sale_starts_at) {
    if (new Date(values.sale_ends_at).getTime() <= new Date(values.sale_starts_at).getTime()) {
      errores.sale_ends_at = 'La fecha de fin debe ser posterior a la de inicio.';
    }
  }

  // Obligatorios de `_product_fields`.
  const relaciones = {
    brand_id: 'Elegí una marca.',
    primary_category_id: 'Elegí la categoría principal.',
    gender_id: 'Elegí el sexo.',
    size_type_id: 'Elegí el tipo de talle.',
  };
  Object.entries(relaciones).forEach(([campo, mensaje]) => {
    if (!values[campo]) errores[campo] = mensaje;
  });

  return errores;
}

/**
 * Arma el payload de `POST`/`PUT` (§10.4).
 *
 * La categoría principal se incluye siempre en `category_ids`: el contrato dice
 * *"incluye a `primary_category_id`"*, y dejarla fuera dejaría el producto sin
 * la categoría por la que se filtra.
 *
 * Los opcionales vacíos viajan como `null` y no como cadena vacía: el backend
 * los normaliza con `or None`, pero el cuerpo dice así lo que se quiso decir.
 */
export function toPayload(values) {
  const entero = (valor) => Number.parseInt(valor, 10);

  const categorias = new Set((values.category_ids ?? []).map(Number));
  if (values.primary_category_id) categorias.add(entero(values.primary_category_id));

  return {
    name: values.name.trim(),
    // El slug no viaja: lo genera el backend a partir de `name` al crear y
    // no se toca después (`ProductForm` solo edita, nunca lo muestra
    // editable). Enviar cualquier valor acá sería tráfico ignorado.
    sku: values.sku.trim(),
    description: values.description?.trim() || null,
    list_price: entero(values.list_price),
    sale_price: values.sale_price?.toString().trim() ? entero(values.sale_price) : null,
    sale_starts_at: localInputToIso(values.sale_starts_at),
    sale_ends_at: localInputToIso(values.sale_ends_at),
    is_active: Boolean(values.is_active),
    is_featured: Boolean(values.is_featured),
    is_new: Boolean(values.is_new),
    brand_id: entero(values.brand_id),
    primary_category_id: entero(values.primary_category_id),
    gender_id: entero(values.gender_id),
    size_type_id: entero(values.size_type_id),
    category_ids: [...categorias],
    sport_ids: (values.sport_ids ?? []).map(Number),
    size_ids: (values.size_ids ?? []).map(Number),
  };
}

/**
 * `AD-15`: las variantes se generan al reconciliar talles. Avisar de cuántas
 * saldrán evita que el administrador cree cien sin querer.
 */
export function expectedVariantCount(values) {
  return (values.size_ids ?? []).length;
}

/**
 * Alta rápida (carga en serie desde el listado): solo los campos que el
 * administrador pidió tener a mano. El resto no desaparece del modelo — sigue
 * existiendo `sku`, `slug`, `descripción`, categorías adicionales, deportes,
 * destacado/nuevo y ofertas — pero se completan con valores neutros aquí y se
 * ajustan, si hace falta, editando el producto después. Las ofertas se cargan
 * aparte, desde Promociones: por eso este formulario no pide `sale_price`.
 */
export const QUICK_VACIO = {
  name: '',
  list_price: '',
  is_active: true,
  brand_id: '',
  primary_category_id: '',
  gender_id: '',
  size_type_id: '',
  size_ids: [],
};

/** Igual que {@link validate}, pero sin los campos que el alta rápida no pide. */
export function validateQuick(values) {
  const errores = {};

  const nombre = values.name?.trim();
  if (!nombre) errores.name = 'El nombre es obligatorio.';
  else if (nombre.length > MAX_NAME_LENGTH) {
    errores.name = `No puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  if (!values.list_price?.toString().trim()) {
    errores.list_price = 'El precio es obligatorio.';
  } else if (!esEnteroPositivo(values.list_price)) {
    errores.list_price = 'Debe ser un número entero mayor que cero, en guaraníes.';
  }

  const relaciones = {
    brand_id: 'Elegí una marca.',
    primary_category_id: 'Elegí una categoría.',
    gender_id: 'Elegí el sexo.',
    size_type_id: 'Elegí el tipo de talle.',
  };
  Object.entries(relaciones).forEach(([campo, mensaje]) => {
    if (!values[campo]) errores[campo] = mensaje;
  });

  return errores;
}

/**
 * SKU único generado en el cliente: el backend lo exige (único, obligatorio)
 * pero el alta rápida no lo pide porque no es un dato que el negocio necesite
 * decidir a mano — es un identificador interno. El slug queda afuera del
 * payload a propósito: el backend ya lo deriva del nombre.
 */
function generarSku(nombre) {
  const base = (nombre || 'PROD')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase()
    .slice(0, 40) || 'PROD';
  const sufijo = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`.toUpperCase();
  return `${base}-${sufijo}`.slice(0, MAX_SKU_LENGTH);
}

/** Payload de `POST` para el alta rápida, con los campos omitidos en blanco. */
export function toQuickPayload(values) {
  const entero = (valor) => Number.parseInt(valor, 10);

  return {
    name: values.name.trim(),
    sku: generarSku(values.name),
    description: null,
    list_price: entero(values.list_price),
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
    is_active: Boolean(values.is_active),
    is_featured: false,
    is_new: false,
    brand_id: entero(values.brand_id),
    primary_category_id: entero(values.primary_category_id),
    gender_id: entero(values.gender_id),
    size_type_id: entero(values.size_type_id),
    category_ids: [entero(values.primary_category_id)],
    sport_ids: [],
    size_ids: (values.size_ids ?? []).map(Number),
  };
}
