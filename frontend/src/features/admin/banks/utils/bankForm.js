/**
 * Conversión entre el DTO y el formulario, validación y armado del multipart.
 *
 * Lógica pura, sin React, mismo criterio que `bannerForm.js`. Replica lo que
 * `bank_schemas.parse_bank` ya exige, para avisar antes de la petición; el
 * servidor sigue siendo quien decide.
 */

export const MAX_NAME_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
export const MIN_DISCOUNT = 1;
export const MAX_DISCOUNT = 99;

/** Estado inicial del formulario a partir de un `BankAdminDTO`, o vacío. */
export function toFormValues(bank) {
  if (!bank) {
    return {
      name: '',
      description: '',
      discount_percentage: '',
      position: '0',
      is_active: true,
    };
  }

  return {
    name: bank.name ?? '',
    description: bank.description ?? '',
    discount_percentage: String(bank.discount_percentage ?? ''),
    position: String(bank.position ?? 0),
    is_active: Boolean(bank.is_active),
  };
}

/**
 * Valida el formulario. Devuelve `{ campo: mensaje }`, vacío si todo está bien.
 *
 * @param values Estado del formulario.
 * @param options `hasImage` indica si hay imagen que enviar —archivo nuevo o
 *   la ya cargada—: obligatoria solo cuando no hay ninguna (alta).
 */
export function validate(values, { hasImage = true } = {}) {
  const errores = {};

  const nombre = values.name?.trim();
  if (!nombre) {
    errores.name = 'El nombre es obligatorio.';
  } else if (nombre.length > MAX_NAME_LENGTH) {
    errores.name = `El nombre no puede superar los ${MAX_NAME_LENGTH} caracteres.`;
  }

  const porcentaje = values.discount_percentage?.toString().trim();
  if (!porcentaje) {
    errores.discount_percentage = 'El porcentaje es obligatorio.';
  } else if (!/^\d+$/.test(porcentaje)) {
    errores.discount_percentage = 'El porcentaje debe ser un número entero.';
  } else {
    const valor = Number.parseInt(porcentaje, 10);
    if (valor < MIN_DISCOUNT || valor > MAX_DISCOUNT) {
      errores.discount_percentage = `El porcentaje debe estar entre ${MIN_DISCOUNT} y ${MAX_DISCOUNT}.`;
    }
  }

  const posicion = values.position?.toString().trim();
  if (!posicion) {
    errores.position = 'La posición es obligatoria.';
  } else if (!/^\d+$/.test(posicion)) {
    errores.position = 'La posición debe ser un número entero de 0 o mayor.';
  }

  if ((values.description?.trim().length ?? 0) > MAX_DESCRIPTION_LENGTH) {
    errores.description = `La descripción no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`;
  }

  if (!hasImage) {
    errores.image = 'El mini banner es obligatorio.';
  }

  return errores;
}

/**
 * Arma el `multipart/form-data` que esperan `POST` y `PUT`.
 *
 * @param file Imagen nueva, o `null` para conservar la actual (solo en `PUT`).
 */
export function toFormData(values, file) {
  const formData = new FormData();

  formData.append('name', values.name.trim());
  const descripcion = values.description?.trim();
  if (descripcion) formData.append('description', descripcion);
  formData.append('discount_percentage', values.discount_percentage.toString().trim());
  formData.append('position', values.position.toString().trim());
  // Siempre viaja: su ausencia significa `true` para el servidor, de modo que
  // omitirlo al desactivar lo dejaría activo.
  formData.append('is_active', values.is_active ? 'true' : 'false');

  if (file) formData.append('image', file);

  return formData;
}
