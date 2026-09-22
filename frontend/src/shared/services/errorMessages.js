/**
 * Catálogo central de mensajes de error de API (06_FRONTEND.md §10.5).
 *
 * Traduce el **código estable** del contrato (`AD-16`) y el `status` HTTP a un
 * texto en español para el usuario. Nunca devuelve el mensaje crudo del
 * servidor ni detalles técnicos (`ERR-04`): `ApiError.message` ya es el código,
 * no una frase, y aun así no se muestra tal cual.
 *
 * Los formularios del panel mantienen además su traducción propia de `422`/`409`
 * (necesitan nombrar el campo o la regla `RN-xx`); este catálogo cubre lo
 * transversal: red, límite de tasa, sesión, permisos y el genérico.
 */

/** 03_SEGURIDAD.md §14: mensaje único para cualquier `429`, sin tecnicismos. */
export const RATE_LIMIT_MESSAGE = 'Demasiadas solicitudes. Esperá un momento y volvé a intentar.';

const NETWORK_MESSAGE = 'No pudimos conectar con el servidor.';

/** `true` si el error es un `429` (límite de tasa). */
export function isRateLimit(error) {
  return error?.status === 429;
}

/** `true` si el error es un fallo de red (no se pudo verificar la respuesta). */
export function isNetworkFailure(error) {
  return Boolean(error?.isNetworkFailure);
}

/**
 * Devuelve el mensaje en español para un `ApiError`.
 *
 * @param error   instancia de `ApiError` (o similar con `status` / `isNetworkFailure`).
 * @param options.fallback  texto para lo no contemplado (por defecto, uno genérico).
 * @param options.notFound  texto específico para `404`, si la pantalla lo necesita.
 */
export function describeApiError(error, { fallback, notFound } = {}) {
  const generico = fallback ?? 'No pudimos completar la operación. Intentá de nuevo.';

  if (!error) return generico;
  if (isNetworkFailure(error)) return NETWORK_MESSAGE;

  switch (error.status) {
    case 401:
      return 'Tu sesión expiró. Ingresá de nuevo.';
    case 403:
      return 'No tenés permiso para realizar esta acción.';
    case 404:
      return notFound ?? 'No encontramos lo que buscabas.';
    case 429:
      return RATE_LIMIT_MESSAGE;
    case 500:
    case 502:
    case 503:
      return 'El servidor tuvo un problema. Probá de nuevo en unos minutos.';
    default:
      return generico;
  }
}
