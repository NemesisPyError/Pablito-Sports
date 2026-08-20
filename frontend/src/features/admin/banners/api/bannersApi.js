import { del, get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * Banners del panel (05_API.md §9.11).
 *
 * §9.11 define **listado paginado sin filtros**: `page` y `per_page` son los
 * únicos parámetros, y el orden lo fija el servidor (`position`, desempatado
 * por `id`).
 *
 * La escritura viaja como `multipart/form-data` porque `image` es un archivo
 * (§10.13). El `Content-Type` se deja sin fijar en cada llamada: el navegador
 * debe añadir el `boundary` del multipart, y pasarlo a mano lo rompería.
 */
const MULTIPART = { headers: { 'Content-Type': undefined } };

export const bannersApi = {
  async list({ page = 1, perPage = 20 } = {}) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const { data, meta } = await get(`/admin/banners?${params.toString()}`);
    return { items: data ?? [], meta };
  },

  /** §9.11. `BannerAdminDTO`. */
  async detail(bannerId) {
    const { data } = await get(`/admin/banners/${bannerId}`);
    return data;
  },

  /** §9.11. La imagen es obligatoria al crear (§10.13). Responde 201. */
  async create(formData) {
    const { data } = await post('/admin/banners', formData, MULTIPART);
    return data;
  },

  /** §9.11. Sin campo `image`, el banner conserva la imagen que ya tenía. */
  async update(bannerId, formData) {
    const { data } = await put(`/admin/banners/${bannerId}`, formData, MULTIPART);
    return data;
  },

  /** §9.11: borrado lógico; responde 200 con el banner eliminado. */
  async remove(bannerId) {
    const { data } = await del(`/admin/banners/${bannerId}`);
    return data;
  },
};
