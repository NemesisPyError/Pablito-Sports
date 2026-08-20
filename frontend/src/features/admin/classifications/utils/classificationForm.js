/**
 * Conversión y validación del formulario de clasificaciones.
 *
 * Lógica pura, sin React: es lo único que este proyecto puede testear hoy.
 * Replica lo que el backend ya exige (§10.13 y `_fields_from_payload`); **no**
 * añade reglas propias.
 */

const SOLO_DIGITOS = /^\d+$/;

/**
 * Ejemplo y ayuda del campo "Nombre" según el tipo de talle elegido
 * (v1.4.0, `RN-15b`). `null` para `one_size`: sin restricción de formato.
 */
export function sizeNameHint(sizeTypeSlug) {
  if (sizeTypeSlug === 'footwear_numeric') {
    return { placeholder: 'Ej: 35, 36, 42', ayuda: 'Un talle de Calzado es numérico.' };
  }
  if (sizeTypeSlug === 'apparel_alpha') {
    return { placeholder: 'Ej: XS, S, M, L, XL', ayuda: 'Un talle de Indumentaria no es un número.' };
  }
  return null;
}

/** 04 §9.2.3 (v1.1.0). */
export const MAX_TAGLINE_LENGTH = 255;

/**
 * Deriva un slug legible del nombre.
 *
 * Sólo es una ayuda al escribir: el backend acepta el slug tal como llegue, y
 * `RN-79` impide reutilizarlo, así que nunca se recalcula sobre uno existente.
 */
export function slugify(texto) {
  return (
    String(texto ?? '')
      .normalize('NFD')
      // Quita los diacríticos ya separados por NFD: "Fútbol" -> "futbol".
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

export function toFormValues(entidad) {
  return {
    name: entidad?.name ?? '',
    slug: entidad?.slug ?? '',
    is_active: entidad ? Boolean(entidad.is_active) : true,
    parent_id: entidad?.parent_id != null ? String(entidad.parent_id) : '',
    size_type_id: entidad?.size_type_id != null ? String(entidad.size_type_id) : '',
    tagline: entidad?.tagline ?? '',
    // Vacío significa «sin bloque propio en la portada», que no es lo mismo
    // que la posición 0: esa es la primera marca destacada.
    home_position: entidad?.home_position != null ? String(entidad.home_position) : '',
  };
}

/**
 * @param values Estado del formulario.
 * @param config Entrada de `CLASSIFICATIONS`: aporta el máximo y el campo extra.
 * @param tiposDeTalle Lista de `SizeTypeAdminDTO` (solo para el recurso "sizes").
 */
export function validate(values, config, tiposDeTalle) {
  const errores = {};
  const maximo = config?.maxLength ?? 100;

  const nombre = values.name?.trim();
  if (!nombre) errores.name = 'El nombre es obligatorio.';
  else if (nombre.length > maximo) {
    errores.name = `No puede superar los ${maximo} caracteres.`;
  } else if (config?.campoExtra === 'sizeType' && values.size_type_id) {
    // RN-15b: el nombre debe ser coherente con el tipo de talle elegido.
    const tipo = (tiposDeTalle ?? []).find((t) => String(t.id) === String(values.size_type_id));
    const esNumerico = SOLO_DIGITOS.test(nombre);
    if (tipo?.slug === 'footwear_numeric' && !esNumerico) {
      errores.name = 'Un talle de Calzado debe ser numérico, ej: 35, 42.';
    } else if (tipo?.slug === 'apparel_alpha' && esNumerico) {
      errores.name = 'Un talle de Indumentaria no puede ser puramente numérico, ej: XS, M, XL.';
    }
  }

  const slug = values.slug?.trim();
  if (!slug) errores.slug = 'El slug es obligatorio.';
  else if (slug.length > maximo) {
    errores.slug = `No puede superar los ${maximo} caracteres.`;
  }

  if (config?.esPiezaDePortada) {
    if ((values.tagline?.trim().length ?? 0) > MAX_TAGLINE_LENGTH) {
      errores.tagline = `No puede superar los ${MAX_TAGLINE_LENGTH} caracteres.`;
    }

    const posicion = values.home_position?.toString().trim();
    // 04 §9.2.3: `CHECK (home_position IS NULL OR home_position >= 0)`.
    if (posicion && !/^\d+$/.test(posicion)) {
      errores.home_position = 'Debe ser un número entero de 0 o mayor, o quedar vacío.';
    }
  }

  if (config?.campoExtra === 'sizeType' && !values.size_type_id) {
    // `_fields_from_payload` lo exige y responde 422 sin él.
    errores.size_type_id = 'Elegí el tipo de talle.';
  }

  return errores;
}

/**
 * Arma el payload. Sólo viajan los campos del recurso: mandar `parent_id` a un
 * deporte sería ruido que el backend ignora, pero que confunde al leer la red.
 */
export function toPayload(values, config) {
  const payload = {
    name: values.name.trim(),
    slug: values.slug.trim(),
    is_active: Boolean(values.is_active),
  };

  if (config?.campoExtra === 'parent') {
    // `AD-24`: sin padre es categoría raíz.
    payload.parent_id = values.parent_id ? Number.parseInt(values.parent_id, 10) : null;
  }
  if (config?.campoExtra === 'sizeType') {
    payload.size_type_id = Number.parseInt(values.size_type_id, 10);
  }

  if (config?.esPiezaDePortada) {
    payload.tagline = values.tagline?.trim() || null;
    const posicion = values.home_position?.toString().trim();
    payload.home_position = posicion ? Number.parseInt(posicion, 10) : null;
  }

  return payload;
}

/**
 * Candidatas a categoría padre (`AD-24`: dos niveles como máximo).
 *
 * Se excluyen las que ya son hijas —no puede haber un tercer nivel— y la propia
 * categoría, que no puede ser su padre (`CHECK parent_not_self`).
 */
export function parentOptions(categorias, categoriaActualId) {
  return (categorias ?? []).filter(
    (categoria) =>
      categoria.parent_id == null && String(categoria.id) !== String(categoriaActualId ?? ''),
  );
}
