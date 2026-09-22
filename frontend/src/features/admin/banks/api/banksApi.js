import { del, get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * Bancos de Superdescuentos del panel.
 *
 * Mismo criterio que `bannersApi.js`: listado paginado sin filtros, y la
 * escritura viaja como `multipart/form-data` porque `image` es un archivo.
 * El `Content-Type` se deja sin fijar para que el navegador añada el
 * `boundary` del multipart.
 */
const MULTIPART = { headers: { 'Content-Type': undefined } };

export const banksApi = {
  async list({ page = 1, perPage = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const { data, meta } = await get(`/admin/banks?${params.toString()}`);
    return { items: data ?? [], meta };
  },

  async detail(bankId) {
    const { data } = await get(`/admin/banks/${bankId}`);
    return data;
  },

  /** La imagen es obligatoria al crear. Responde 201. */
  async create(formData) {
    const { data } = await post('/admin/banks', formData, MULTIPART);
    return data;
  },

  /** Sin campo `image`, el banco conserva la imagen que ya tenía. */
  async update(bankId, formData) {
    const { data } = await put(`/admin/banks/${bankId}`, formData, MULTIPART);
    return data;
  },

  /** Borrado lógico; responde 200 con el banco eliminado. */
  async remove(bankId) {
    const { data } = await del(`/admin/banks/${bankId}`);
    return data;
  },
};
