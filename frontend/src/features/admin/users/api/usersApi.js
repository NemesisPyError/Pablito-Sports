import { del, get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * Gestión de administradores del panel (05_API.md §9.14).
 *
 * `RN-67`: el backend exige rol `super_administrator` en todo el módulo, salvo
 * `changePassword`, que 07_PANEL_ADMIN.md §8.1 abre a cualquier administrador
 * para su propia contraseña (`CU-A-27`). El hash nunca viaja: el servidor
 * recibe la contraseña en claro solo por HTTPS y devuelve DTOs sin ella
 * (03_SEGURIDAD.md §5.5).
 */
export const usersApi = {
  async list({ page = 1, perPage = 100 } = {}) {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    const { data, meta } = await get(`/admin/users?${params.toString()}`);
    return { items: data ?? [], meta };
  },

  async detail(userId) {
    const { data } = await get(`/admin/users/${userId}`);
    return data;
  },

  async create(payload) {
    const { data } = await post('/admin/users', payload);
    return data;
  },

  async update(userId, payload) {
    const { data } = await put(`/admin/users/${userId}`, payload);
    return data;
  },

  /** §9.14: `204` sin cuerpo; `409` por `RN-71`/`RN-72`. */
  async remove(userId) {
    await del(`/admin/users/${userId}`);
  },

  /**
   * §9.14: `204`. `current_password` solo se envía al cambiar la propia; el
   * backend la exige en ese caso y la ignora cuando un superadministrador
   * cambia la de otro usuario. Cambiar la propia invalida la sesión (§7.3).
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const payload = { new_password: newPassword };
    if (currentPassword) payload.current_password = currentPassword;
    await post(`/admin/users/${userId}/change-password`, payload);
  },
};
