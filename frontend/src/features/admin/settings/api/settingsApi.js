import { del, get, put } from '../../../../shared/services/apiClient.js';

/**
 * Configuración de la tienda (05_API.md §9.12).
 *
 * §9.12 define un recurso único: no hay listado, ni alta, ni baja. El `PUT`
 * reemplaza el recurso completo, de modo que el cuerpo lleva siempre todos los
 * campos obligatorios, no solo los que cambiaron.
 *
 * Las plantillas de WhatsApp viven en estos mismos campos. §9.13 las expone
 * además como recurso aparte, con su propio cliente en
 * `features/admin/whatsapp/api/whatsappTemplateApi.js` (§14.8).
 */
export const settingsApi = {
  /** §9.12. `StoreSettingsAdminDTO`. */
  async detail() {
    const { data } = await get('/admin/store/settings');
    return data;
  },

  /** §9.12. Devuelve el DTO ya actualizado. */
  async update(payload) {
    const { data } = await put('/admin/store/settings', payload);
    return data;
  },

  /**
   * §9.12 (v1.1.0). Foto de «Nuestra historia», por su propio recurso.
   *
   * El `Content-Type` se deja sin fijar: el navegador debe añadir el `boundary`
   * del multipart, y pasarlo a mano lo rompería.
   */
  async setAboutImage(formData) {
    const { data } = await put('/admin/store/about-image', formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  /** §9.12 (v1.1.0). Quita la foto sin tocar el texto. */
  async deleteAboutImage() {
    const { data } = await del('/admin/store/about-image');
    return data;
  },
};
