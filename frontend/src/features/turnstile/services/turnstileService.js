import { get, post } from '../../../shared/services/apiClient.js';

/**
 * Verificación de Cloudflare Turnstile en el acceso a la tienda.
 */
export const turnstileService = {
  /**
   * GET /api/v1/turnstile/status.
   *
   * `required: false` es el atajo de desarrollo: sin credenciales de
   * Cloudflare configuradas en el backend, la tienda no pide ningún widget.
   */
  async getStatus() {
    const { data } = await get('/turnstile/status');
    return data;
  },

  /**
   * POST /api/v1/turnstile/verify.
   *
   * El backend es quien decide si el token es válido — llamando de verdad a
   * Cloudflare — y, si lo es, deja la cookie que evita pedir la verificación
   * de nuevo en esta misma visita.
   */
  async verify(token) {
    const { data } = await post('/turnstile/verify', { token });
    return data;
  },
};
