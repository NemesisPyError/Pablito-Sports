import axios from 'axios';

/**
 * Cliente HTTP base.
 *
 * La envoltura AD-16 se desenvuelve en un solo lugar (02_ARQUITECTURA.md §8.7):
 * ningún componente ni servicio de feature vuelve a mirar `success`/`data`.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Token CSRF del panel (03_SEGURIDAD.md §8.2).
 *
 * El servidor lo entrega en el login y en `/auth/me`; vive solo en memoria, no
 * en `localStorage`: un token que sobrevive a la pestaña sobrevive también a un
 * XSS que lo lea.
 */
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token ?? null;
}

/**
 * Suscriptor de sesión perdida.
 *
 * Cualquier `401` significa que la sesión del panel expiró o fue invalidada
 * (§7.3). Se avisa en un solo lugar para que ninguna pantalla tenga que
 * repetir la comprobación.
 */
let onUnauthorized = null;

export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

/** Error de API con el código estable del contrato, nunca el mensaje del servidor. */
export class ApiError extends Error {
  constructor({ status, errors, requestId }) {
    super(errors?.[0]?.code ?? 'network_error');
    this.name = 'ApiError';
    this.status = status ?? null;
    this.errors = errors ?? [];
    this.requestId = requestId ?? null;
    // AD-30: distinguir "no se pudo verificar" de "verificado con cambios".
    this.isNetworkFailure = status === null;
  }
}

function unwrap(response) {
  return { data: response.data?.data, meta: response.data?.meta ?? {} };
}

// §8.2: el token acompaña a toda escritura del panel. Las lecturas no lo llevan
// (§8.3) y la API pública tampoco lo necesita.
api.interceptors.request.use((config) => {
  const method = (config.method ?? 'get').toLowerCase();
  const esEscritura = method !== 'get' && method !== 'head';
  const esPanel = (config.url ?? '').startsWith('/admin');
  if (esEscritura && esPanel && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const body = error.response?.data;
    if (error.response?.status === 401) {
      csrfToken = null;
      onUnauthorized?.();
    }
    throw new ApiError({
      status: error.response?.status ?? null,
      errors: body?.errors,
      requestId: body?.meta?.request_id,
    });
  },
);

export async function get(url, config) {
  return unwrap(await api.get(url, config));
}

export async function post(url, payload, config) {
  return unwrap(await api.post(url, payload, config));
}

export async function put(url, payload, config) {
  return unwrap(await api.put(url, payload, config));
}

export async function del(url, config) {
  return unwrap(await api.delete(url, config));
}
