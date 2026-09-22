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

/**
 * Límites del descuento, los mismos que Promociones (`promotionForm.js`):
 * el panel ofrece un único criterio de descuento, se cargue desde donde se
 * cargue. `99` es el techo porque un 100% dejaría el producto en cero, y `0`
 * no es un descuento — para "sin oferta" el campo va vacío.
 */
export const MIN_DISCOUNT = 1;
export const MAX_DISCOUNT = 99;

function enteroPositivo(valor) {
  const numero = Number.parseInt(String(valor ?? '').trim(), 10);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

/**
 * Precio de oferta que resulta de aplicar un porcentaje al precio de lista
 * (pedido explícito del usuario: en el alta de productos se carga el descuento,
 * no el precio final, igual que en Promociones).
 *
 * `sale_price` sigue siendo lo que viaja a la API — el backend no conoce
 * porcentajes—, así que esta es la única fuente de ese valor: el formulario ya
 * no lo pide a mano. Devuelve `''` cuando falta el precio de lista o el
 * porcentaje está fuera de rango, que es como el formulario representa "sin
 * oferta".
 *
 * El guaraní no tiene decimales (§7 de 04): se redondea a entero.
 */
export function precioConDescuento(listPrice, porcentaje) {
  const lista = enteroPositivo(listPrice);
  const pct = Number.parseInt(String(porcentaje ?? '').trim(), 10);
  if (lista === null) return '';
  if (!Number.isInteger(pct) || pct < MIN_DISCOUNT || pct > MAX_DISCOUNT) return '';
  return String(Math.round(lista * (1 - pct / 100)));
}

/**
 * Operación inversa, para editar: la base guarda `sale_price`, no el descuento,
 * así que al abrir un producto con oferta hay que reconstruir el porcentaje que
 * la originó. Un precio de oferta que no sea menor al de lista no representa
 * ningún descuento válido y vuelve vacío.
 */
export function descuentoDesdePrecio(listPrice, salePrice) {
  const lista = enteroPositivo(listPrice);
  const oferta = enteroPositivo(salePrice);
  if (lista === null || oferta === null || oferta >= lista) return '';
  return String(Math.round((1 - oferta / lista) * 100));
}

/**
 * Formato título para el nombre del producto (pedido explícito del usuario,
 * 2026-08-24): "nike air" → "Nike Air", "NIKE AIR MAX" → "Nike Air Max".
 *
 * No existe en el proyecto ninguna regla ya definida de acrónimos o términos
 * especiales para nombres de producto (se buscó antes de escribir esto), así
 * que la normalización es capitalizar cada palabra separada por espacio y
 * poner el resto en minúscula — exactamente lo que piden los tres ejemplos.
 * Los espacios repetidos se colapsan de paso, para no guardar "Nike  Air".
 */
export function toTitleCase(texto) {
  return String(texto ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((palabra) =>
      palabra ? palabra[0].toUpperCase() + palabra.slice(1).toLowerCase() : palabra,
    )
    .join(' ');
}

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
  // El formulario ya no pide el precio de oferta: pide el descuento y deriva
  // el precio con {@link precioConDescuento}. Vacío = sin oferta.
  discount_percentage: '',
  sale_starts_at: '',
  sale_ends_at: '',
  is_active: true,
  is_featured: false,
  is_new: false,
  brand_id: '',
  primary_category_id: '',
  size_type_id: '',
  category_ids: [],
  sport_ids: [],
  size_ids: [],
  gender_ids: [],
  // Cantidad por talle (07_PANEL_ADMIN.md §14.3, pedido explícito del
  // usuario): no es un campo de `_product_fields` — la variante y su `id`
  // recién existen después de guardar (`AD-15`) — así que viaja aparte del
  // payload y se reconcilia después, contra `PATCH .../variants/{id}`, igual
  // que ya hacía el alta rápida con las imágenes pendientes. Mapa
  // `size_id (string) -> cantidad (string)`, mismo patrón que los demás
  // campos numéricos del formulario.
  size_quantities: {},
};

/**
 * Estado inicial a partir del detalle administrativo.
 *
 * El DTO de §9.3 devuelve las relaciones **con identificador**
 * (`genders: [{id, name}]`, `categories: [{id, name}]`), de modo que el
 * formulario las precarga directamente. `sale_price` es la columna del
 * producto, no el precio efectivo de una promoción: reenviarlo en el `PUT`
 * no lo corrompe.
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
    discount_percentage: descuentoDesdePrecio(product.list_price, product.sale_price),
    sale_starts_at: isoToLocalInput(product.sale_starts_at),
    sale_ends_at: isoToLocalInput(product.sale_ends_at),
    is_active: Boolean(product.is_active),
    is_featured: Boolean(product.is_featured),
    is_new: Boolean(product.is_new),
    brand_id: product.brand?.id != null ? String(product.brand.id) : '',
    primary_category_id:
      product.primary_category?.id != null ? String(product.primary_category.id) : '',
    size_type_id: product.size_type?.id != null ? String(product.size_type.id) : '',
    // La principal se incluye sola (RN, pedido explícito del usuario): si el
    // producto quedó guardado con la misma categoría también como
    // adicional (dato viejo, de antes de esta regla, o cargado por afuera
    // del formulario), se limpia acá — el checkbox de "Categorías
    // adicionales" ni siquiera la ofrece, así que dejarla en la lista sería
    // un id fantasma que nadie puede destildar.
    category_ids: ids(product.categories).filter((id) => id !== product.primary_category?.id),
    sport_ids: ids(product.sports),
    size_ids: ids(product.sizes),
    gender_ids: ids(product.genders),
    size_quantities: Object.fromEntries(
      (product.variants ?? [])
        .filter((variante) => variante.size?.id != null)
        .map((variante) => [String(variante.size.id), String(variante.quantity ?? 0)]),
    ),
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

  // El SKU no es obligatorio en el formulario: si queda en blanco,
  // {@link toPayload} genera uno — mismo criterio que tenía el alta rápida,
  // ahora disponible también al editar.
  const sku = values.sku?.trim();
  if (sku && sku.length > MAX_SKU_LENGTH) {
    errores.sku = `No puede superar los ${MAX_SKU_LENGTH} caracteres.`;
  }

  // 04 §9.2.10: `CHECK (list_price > 0)`.
  if (!values.list_price?.toString().trim()) {
    errores.list_price = 'El precio de lista es obligatorio.';
  } else if (!esEnteroPositivo(values.list_price)) {
    errores.list_price = 'Debe ser un número entero mayor que cero, en guaraníes.';
  }

  /*
   * El descuento reemplaza al precio de oferta como campo de entrada. El
   * `CHECK (sale_price IS NULL OR sale_price < list_price)` de 04 §9.2.10 se
   * cumple por construcción: {@link precioConDescuento} solo acepta de 1 a 99,
   * así que el precio derivado siempre queda por debajo del de lista. Lo que
   * hay que validar acá es el rango de lo que el usuario escribe.
   */
  const descuento = values.discount_percentage?.toString().trim();
  if (descuento) {
    const pct = Number.parseInt(descuento, 10);
    if (!/^\d+$/.test(descuento) || !Number.isInteger(pct)) {
      errores.discount_percentage = 'Debe ser un número entero.';
    } else if (pct < MIN_DISCOUNT || pct > MAX_DISCOUNT) {
      errores.discount_percentage = `Debe estar entre ${MIN_DISCOUNT} y ${MAX_DISCOUNT}.`;
    } else if (!esEnteroPositivo(values.list_price)) {
      errores.discount_percentage = 'Cargá primero el precio de lista.';
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
    size_type_id: 'Elegí el tipo de talle.',
  };
  Object.entries(relaciones).forEach(([campo, mensaje]) => {
    if (!values[campo]) errores[campo] = mensaje;
  });

  // `gender_ids` es una lista (RN-09, v2.9.0): `!valor` no detecta `[]`
  // vacío, hace falta el chequeo de longitud aparte.
  if ((values.gender_ids ?? []).length === 0) {
    errores.gender_ids = 'Elegí al menos un sexo.';
  }

  return errores;
}

/**
 * SKU de respaldo, generado en el cliente cuando el campo queda en blanco: el
 * backend lo exige (único, obligatorio) pero no siempre es un dato que el
 * administrador quiera pensar a mano — es un identificador interno. Antes
 * era exclusivo del alta rápida; ahora que "Crear" y "Editar" comparten
 * formulario, cualquiera de los dos puede dejarlo en blanco.
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

/**
 * Arma el payload de `POST`/`PUT` (§10.4).
 *
 * La categoría principal se incluye siempre en `category_ids`: el contrato dice
 * *"incluye a `primary_category_id`"*, y dejarla fuera dejaría el producto sin
 * la categoría por la que se filtra.
 *
 * Los opcionales vacíos viajan como `null` y no como cadena vacía: el backend
 * los normaliza con `or None`, pero el cuerpo dice así lo que se quiso decir.
 *
 * El nombre se normaliza a formato título acá (pedido explícito del usuario,
 * 2026-08-24), tanto al crear como al editar: es el único lugar por el que
 * pasan los dos flujos antes de armar el cuerpo de la petición.
 */
export function toPayload(values) {
  const entero = (valor) => Number.parseInt(valor, 10);
  const nombre = toTitleCase(values.name);

  const categorias = new Set((values.category_ids ?? []).map(Number));
  if (values.primary_category_id) categorias.add(entero(values.primary_category_id));

  return {
    name: nombre,
    // El slug no viaja: lo genera el backend a partir de `name` (v2.9.2: ya
    // normalizado a título) al crear, y no se toca después. Enviar cualquier
    // valor acá sería tráfico ignorado.
    sku: values.sku?.trim() || generarSku(nombre),
    description: values.description?.trim() || null,
    list_price: entero(values.list_price),
    // La API recibe el precio, no el porcentaje: el descuento es la forma de
    // cargarlo en el panel, no un dato nuevo del producto.
    sale_price:
      precioConDescuento(values.list_price, values.discount_percentage) === ''
        ? null
        : entero(precioConDescuento(values.list_price, values.discount_percentage)),
    sale_starts_at: localInputToIso(values.sale_starts_at),
    sale_ends_at: localInputToIso(values.sale_ends_at),
    is_active: Boolean(values.is_active),
    is_featured: Boolean(values.is_featured),
    is_new: Boolean(values.is_new),
    brand_id: entero(values.brand_id),
    primary_category_id: entero(values.primary_category_id),
    size_type_id: entero(values.size_type_id),
    category_ids: [...categorias],
    sport_ids: (values.sport_ids ?? []).map(Number),
    size_ids: (values.size_ids ?? []).map(Number),
    gender_ids: (values.gender_ids ?? []).map(Number),
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
 * Cantidad inicial/actualizada de una variante, a partir de lo que el
 * administrador tipeó en "Talles y stock". `undefined`/vacío cuenta como 0 —
 * un talle marcado sin cantidad nace sin stock, no bloquea el guardado.
 */
export function parsedQuantity(values, sizeId) {
  const crudo = values.size_quantities?.[String(sizeId)];
  const numero = Number.parseInt(crudo, 10);
  return Number.isNaN(numero) || numero < 0 ? 0 : numero;
}
