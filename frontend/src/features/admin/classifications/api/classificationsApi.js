import { del, get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * CRUD de clasificaciones (05_API.md §9.5 a §9.9).
 *
 * Las cinco comparten forma, así que comparten cliente: el recurso viaja como
 * argumento. Lo único que difiere es el borrado de categorías, que responde
 * `204` sin cuerpo mientras las otras cuatro devuelven la entidad.
 */
export const classificationsApi = {
  async list(recurso, { page = 1, perPage = 100 } = {}) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const { data, meta } = await get(`/admin/${recurso}?${params.toString()}`);
    return { items: data ?? [], meta };
  },

  async detail(recurso, id) {
    const { data } = await get(`/admin/${recurso}/${id}`);
    return data;
  },

  async create(recurso, payload) {
    const { data } = await post(`/admin/${recurso}`, payload);
    return data;
  },

  async update(recurso, id, payload) {
    const { data } = await put(`/admin/${recurso}/${id}`, payload);
    return data;
  },

  /** Borrado lógico (`AD-18`). `409` con `RN-68` si tiene dependencias. */
  async remove(recurso, id) {
    const { data } = await del(`/admin/${recurso}/${id}`);
    return data ?? null;
  },

  /** Revierte el borrado lógico. */
  async restore(recurso, id) {
    const { data } = await post(`/admin/${recurso}/${id}/restore`);
    return data;
  },
};

/**
 * Logotipo y collage de marca (05_API.md §9.6, v1.1.0).
 *
 * Recursos propios y en `multipart/form-data` porque son archivos: el CRUD de
 * la marca sigue siendo JSON, de modo que renombrarla no obliga a reenviar sus
 * imágenes. El `Content-Type` se deja sin fijar para que el navegador añada el
 * `boundary`.
 */
const MULTIPART = { headers: { 'Content-Type': undefined } };

export const brandMediaApi = {
  /** Reemplaza el logotipo. Devuelve la marca ya actualizada. */
  async setLogo(brandId, formData) {
    const { data } = await put(`/admin/brands/${brandId}/image`, formData, MULTIPART);
    return data;
  },

  async deleteLogo(brandId) {
    const { data } = await del(`/admin/brands/${brandId}/image`);
    return data;
  },

  async listImages(brandId) {
    const { data } = await get(`/admin/brands/${brandId}/images`);
    return data ?? [];
  },

  /** Agrega una pieza al final del collage. `409` si ya hay cuatro activas. */
  async addImage(brandId, formData) {
    const { data } = await post(`/admin/brands/${brandId}/images`, formData, MULTIPART);
    return data;
  },

  /** El orden viaja completo: un subconjunto dejaría posiciones ambiguas. */
  async reorderImages(brandId, imageIds) {
    const { data } = await put(`/admin/brands/${brandId}/images/order`, { image_ids: imageIds });
    return data ?? [];
  },

  async deleteImage(brandId, imageId) {
    await del(`/admin/brands/${brandId}/images/${imageId}`);
  },
};
