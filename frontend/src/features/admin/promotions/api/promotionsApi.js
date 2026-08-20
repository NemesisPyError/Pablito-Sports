import { del, get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * Promociones del panel (05_API.md §9.10).
 *
 * §9.10 define **listado paginado sin filtros**: `page` y `per_page` son los
 * únicos parámetros. El filtrado por estado y por alcance se resuelve en el
 * cliente, sobre lo que este listado devuelve.
 */
export const promotionsApi = {
  async list({ page = 1, perPage = 100 } = {}) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const { data, meta } = await get(`/admin/promotions?${params.toString()}`);
    return { items: data ?? [], meta };
  },

  async detail(promotionId) {
    const { data } = await get(`/admin/promotions/${promotionId}`);
    return data;
  },

  async create(payload) {
    const { data } = await post('/admin/promotions', payload);
    return data;
  },

  async update(promotionId, payload) {
    const { data } = await put(`/admin/promotions/${promotionId}`, payload);
    return data;
  },

  /** §9.10: borrado lógico; responde 200 con la promoción eliminada. */
  async remove(promotionId) {
    const { data } = await del(`/admin/promotions/${promotionId}`);
    return data;
  },
};
