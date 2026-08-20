import { get, post, setCsrfToken } from '../../../shared/services/apiClient.js';

/**
 * Autenticación del panel (05_API.md §9.1).
 *
 * `AD-37`: la sesión vive en el servidor y viaja en una cookie `HttpOnly`, de
 * modo que el frontend nunca la manipula ni la guarda. Lo único que sí retiene
 * es el token CSRF, que el servidor entrega en el login y en `/auth/me`
 * (03_SEGURIDAD.md §8.2).
 */
export const authApi = {
  /** `POST /admin/auth/login`. Devuelve el administrador autenticado. */
  async login({ username, password }) {
    const { data } = await post('/admin/auth/login', { username, password });
    setCsrfToken(data?.csrf_token);
    return data?.administrator ?? null;
  },

  /** `GET /admin/auth/me`. `401` cuando no hay sesión válida. */
  async me() {
    const { data } = await get('/admin/auth/me');
    setCsrfToken(data?.csrf_token);
    return data?.administrator ?? null;
  },

  /** `POST /admin/auth/logout`. §7.3: invalida la sesión actual. */
  async logout() {
    await post('/admin/auth/logout');
    setCsrfToken(null);
  },
};
