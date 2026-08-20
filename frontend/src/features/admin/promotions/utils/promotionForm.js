import { SCOPE_FIELD, SCOPE_TYPES } from './promotionStatus.js';

/**
 * Conversión entre el DTO y el formulario, y validación de entrada.
 *
 * Se separa de los componentes porque es lógica pura: así se puede probar sin
 * montar React, que es lo único que este proyecto puede testear hoy.
 */

// 04_BASE_DATOS.md §9.2.11: `CHECK (discount_percentage BETWEEN 1 AND 99)`.
export const MIN_DISCOUNT = 1;
export const MAX_DISCOUNT = 99;

/**
 * Convierte una marca ISO a lo que espera `<input type="datetime-local">`.
 *
 * El control trabaja en hora **local** y sin zona, así que hay que descontar el
 * desfase: pasarle la cadena UTC tal cual mostraría una hora equivocada.
 */
export function isoToLocalInput(iso) {
  if (!iso) return '';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  const desfase = fecha.getTimezoneOffset() * 60000;
  return new Date(fecha.getTime() - desfase).toISOString().slice(0, 16);
}

/**
 * Convierte lo que escribe el usuario a ISO con zona.
 *
 * `AD-34`: las marcas se guardan como instantes absolutos. El control entrega
 * hora local sin zona; enviarla tal cual haría que el servidor la interpretara
 * en UTC y la promoción empezaría con horas de diferencia.
 */
export function localInputToIso(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Estado inicial del formulario a partir de un `PromotionDTO`, o vacío. */
export function toFormValues(promotion) {
  if (!promotion) {
    return {
      name: '',
      description: '',
      discount_percentage: '',
      starts_at: '',
      ends_at: '',
      is_active: true,
      scopeType: SCOPE_TYPES.BRAND,
      scopeId: '',
    };
  }

  return {
    name: promotion.name ?? '',
    description: promotion.description ?? '',
    discount_percentage: String(promotion.discount_percentage ?? ''),
    starts_at: isoToLocalInput(promotion.starts_at),
    ends_at: isoToLocalInput(promotion.ends_at),
    is_active: Boolean(promotion.is_active),
    scopeType: promotion.scope?.type ?? SCOPE_TYPES.BRAND,
    // El DTO identifica la entidad por `slug`, no por id (`NamedEntityDTO`).
    // El identificador se resuelve al cargar las opciones del selector.
    scopeSlug: promotion.scope?.entity?.slug ?? '',
    scopeId: '',
  };
}

/**
 * Valida el formulario. Devuelve `{ campo: mensaje }`, vacío si todo está bien.
 *
 * Replica lo que el backend ya exige, para avisar antes de la petición. **No**
 * añade reglas: el servidor sigue siendo quien decide.
 */
export function validate(values) {
  const errores = {};

  if (!values.name?.trim()) {
    errores.name = 'El nombre es obligatorio.';
  } else if (values.name.trim().length > 255) {
    errores.name = 'El nombre no puede superar los 255 caracteres.';
  }

  const descuento = Number.parseInt(values.discount_percentage, 10);
  if (!values.discount_percentage) {
    errores.discount_percentage = 'El descuento es obligatorio.';
  } else if (Number.isNaN(descuento) || descuento < MIN_DISCOUNT || descuento > MAX_DISCOUNT) {
    errores.discount_percentage = `El descuento debe estar entre ${MIN_DISCOUNT} y ${MAX_DISCOUNT}.`;
  }

  if (!values.starts_at) {
    errores.starts_at = 'La fecha de inicio es obligatoria.';
  } else if (Number.isNaN(new Date(values.starts_at).getTime())) {
    errores.starts_at = 'La fecha de inicio no es válida.';
  }

  if (values.ends_at) {
    if (Number.isNaN(new Date(values.ends_at).getTime())) {
      errores.ends_at = 'La fecha de fin no es válida.';
    } else if (
      values.starts_at &&
      new Date(values.ends_at).getTime() <= new Date(values.starts_at).getTime()
    ) {
      errores.ends_at = 'La fecha de fin debe ser posterior a la de inicio.';
    }
  }

  // `RN-36`: exactamente uno de producto, categoría o marca.
  if (!values.scopeId) {
    errores.scopeId = 'Elegí a qué se aplica la promoción.';
  }

  return errores;
}

/**
 * Arma el payload. Solo viaja el campo del alcance elegido: los otros dos se
 * omiten para que el CHECK `scope_exclusive` siga cumpliéndose (`RN-36`).
 */
export function toPayload(values) {
  const payload = {
    name: values.name.trim(),
    discount_percentage: Number.parseInt(values.discount_percentage, 10),
    starts_at: localInputToIso(values.starts_at),
    ends_at: localInputToIso(values.ends_at),
    is_active: Boolean(values.is_active),
  };

  // Una descripción vacía se omite en vez de enviarse como cadena vacía.
  const descripcion = values.description?.trim();
  if (descripcion) payload.description = descripcion;

  payload[SCOPE_FIELD[values.scopeType]] = Number.parseInt(values.scopeId, 10);

  return payload;
}
