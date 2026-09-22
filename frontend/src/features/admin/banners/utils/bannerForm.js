/**
 * Conversión entre el DTO y el formulario, validación y armado del multipart.
 *
 * Se separa de los componentes porque es lógica pura: así se puede probar sin
 * montar React, que es lo único que este proyecto puede testear hoy.
 *
 * La validación replica lo que `banner_schemas.parse_banner` ya exige, para
 * avisar antes de la petición. **No** añade reglas propias: el servidor sigue
 * siendo quien decide.
 */

import { safeHref } from '../../../../shared/utils/safeLink.js';

// 04_BASE_DATOS.md §9.2.12, replicado en `banner_schemas`.
export const MAX_TITLE_LENGTH = 255;
export const MAX_SUBTITLE_LENGTH = 255;
export const MAX_LINK_LENGTH = 500;
export const MAX_BUTTON_LABEL_LENGTH = 50;

/**
 * Zonas de la portada (04 §9.2.12, v1.1.0). Conjunto cerrado: el backend
 * responde `422` ante cualquier otro valor, a diferencia de la lectura pública,
 * que lo ignora.
 */
export const PLACEMENTS = [
  { value: 'hero', label: 'Portada principal' },
  { value: 'news', label: 'Novedades' },
  { value: 'promo', label: 'Promociones' },
];

export const DEFAULT_PLACEMENT = 'hero';

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
 * en UTC y el banner empezaría con horas de diferencia.
 */
export function localInputToIso(valor) {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
}

/** Estado inicial del formulario a partir de un `BannerAdminDTO`, o vacío. */
export function toFormValues(banner) {
  if (!banner) {
    return {
      title: '',
      subtitle: '',
      link_url: '',
      button_label: '',
      placement: DEFAULT_PLACEMENT,
      position: '0',
      starts_at: '',
      ends_at: '',
      is_active: true,
    };
  }

  return {
    title: banner.title ?? '',
    subtitle: banner.subtitle ?? '',
    link_url: banner.link_url ?? '',
    button_label: banner.button_label ?? '',
    placement: banner.placement ?? DEFAULT_PLACEMENT,
    position: String(banner.position ?? 0),
    starts_at: isoToLocalInput(banner.starts_at),
    ends_at: isoToLocalInput(banner.ends_at),
    is_active: Boolean(banner.is_active),
  };
}

/**
 * ¿El enlace es utilizable por el catálogo?
 *
 * El backend solo acota la longitud, pero el catálogo consume `link_url` con
 * el `Link` del router: además de una URL absoluta, admite una ruta interna
 * («/productos/...»). Se aceptan las dos y se rechaza el resto, que incluye
 * esquemas como `javascript:`.
 *
 * La comprobación de esquema **no se repite acá**: la resuelve `safeHref`, el
 * mismo módulo que aplica la tienda al renderizar el enlace. Antes estaba
 * escrita por duplicado, y una divergencia habría dejado al panel aceptando un
 * destino que la tienda después se niega a mostrar.
 *
 * Lo único propio de este formulario es que **el campo es opcional**: vacío no
 * es un error, aunque tampoco sea un destino.
 */
export function isValidLink(valor) {
  const enlace = typeof valor === 'string' ? valor.trim() : valor;
  if (!enlace) return true;
  return safeHref(valor) !== null;
}

/**
 * Valida el formulario. Devuelve `{ campo: mensaje }`, vacío si todo está bien.
 *
 * @param values Estado del formulario.
 * @param options `hasImage` indica si hay imagen que enviar —archivo nuevo o la
 *   ya cargada—, porque §10.13 solo la exige cuando no hay ninguna.
 */
export function validate(values, { hasImage = true } = {}) {
  const errores = {};

  const titulo = values.title?.trim();
  if (!titulo) {
    errores.title = 'El título es obligatorio.';
  } else if (titulo.length > MAX_TITLE_LENGTH) {
    errores.title = `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres.`;
  }

  if ((values.subtitle?.trim().length ?? 0) > MAX_SUBTITLE_LENGTH) {
    errores.subtitle = `El subtítulo no puede superar los ${MAX_SUBTITLE_LENGTH} caracteres.`;
  }

  const enlace = values.link_url?.trim();
  if (enlace) {
    if (enlace.length > MAX_LINK_LENGTH) {
      errores.link_url = `El enlace no puede superar los ${MAX_LINK_LENGTH} caracteres.`;
    } else if (!isValidLink(enlace)) {
      errores.link_url =
        'Ingresá una URL completa (https://…) o una ruta interna que empiece con /.';
    }
  }

  if ((values.button_label?.trim().length ?? 0) > MAX_BUTTON_LABEL_LENGTH) {
    errores.button_label = `El texto del botón no puede superar los ${MAX_BUTTON_LABEL_LENGTH} caracteres.`;
  }

  // El botón sin enlace no lleva a ninguna parte: el catálogo no lo dibuja.
  if (values.button_label?.trim() && !values.link_url?.trim()) {
    errores.button_label = 'Para mostrar el botón hace falta un enlace.';
  }

  if (values.placement && !PLACEMENTS.some((zona) => zona.value === values.placement)) {
    errores.placement = 'Elegí una zona válida.';
  }

  // 04 §9.2.12: `CHECK (position >= 0)`. El entero se exige aquí porque el
  // control numérico admite decimales y el backend los rechaza.
  const posicion = values.position?.toString().trim();
  if (!posicion) {
    errores.position = 'La posición es obligatoria.';
  } else if (!/^\d+$/.test(posicion)) {
    errores.position = 'La posición debe ser un número entero de 0 o mayor.';
  }

  if (values.starts_at && Number.isNaN(new Date(values.starts_at).getTime())) {
    errores.starts_at = 'La fecha de inicio no es válida.';
  }

  if (values.ends_at) {
    if (Number.isNaN(new Date(values.ends_at).getTime())) {
      errores.ends_at = 'La fecha de fin no es válida.';
    } else if (
      values.starts_at &&
      !errores.starts_at &&
      new Date(values.ends_at).getTime() <= new Date(values.starts_at).getTime()
    ) {
      // 04 §9.2.12: `CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)`.
      errores.ends_at = 'La fecha de fin debe ser posterior a la de inicio.';
    }
  }

  // §10.13: obligatoria al crear, omitible al editar si no se reemplaza.
  if (!hasImage) {
    errores.image = 'La imagen es obligatoria.';
  }

  return errores;
}

/**
 * Arma el `multipart/form-data` que esperan `POST` y `PUT` (§10.13).
 *
 * Los campos opcionales vacíos **se omiten** en lugar de viajar como cadena
 * vacía. Da igual para el backend, que normaliza `""` a `None`, pero deja el
 * cuerpo diciendo exactamente lo que se quiso decir.
 *
 * `is_active` sí viaja siempre: su ausencia significa `true` para el servidor,
 * de modo que omitirlo al desactivar lo dejaría activo.
 *
 * @param file Imagen nueva, o `null` para conservar la actual (solo en `PUT`).
 */
export function toFormData(values, file) {
  const formData = new FormData();

  formData.append('title', values.title.trim());
  formData.append('position', values.position.toString().trim());
  formData.append('is_active', values.is_active ? 'true' : 'false');
  // Siempre viaja: su ausencia significa `hero` para el servidor, de modo que
  // omitirlo al mover una pieza a otra zona la devolvería a la portada.
  formData.append('placement', values.placement || DEFAULT_PLACEMENT);

  const subtitulo = values.subtitle?.trim();
  if (subtitulo) formData.append('subtitle', subtitulo);

  const enlace = values.link_url?.trim();
  if (enlace) formData.append('link_url', enlace);

  const boton = values.button_label?.trim();
  if (boton) formData.append('button_label', boton);

  const inicio = localInputToIso(values.starts_at);
  if (inicio) formData.append('starts_at', inicio);

  const fin = localInputToIso(values.ends_at);
  if (fin) formData.append('ends_at', fin);

  if (file) formData.append('image', file);

  return formData;
}
