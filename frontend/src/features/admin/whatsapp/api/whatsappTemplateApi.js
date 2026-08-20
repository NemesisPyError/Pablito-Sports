import { get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * Plantilla de WhatsApp como recurso propio (05_API.md §9.13).
 *
 * Mismas columnas que `settingsApi` (`message_template`, `item_template`),
 * expuestas aparte porque tienen su propia pantalla, con vista previa y
 * restauración (07_PANEL_ADMIN.md §14.8).
 */
export const whatsappTemplateApi = {
  /** §9.13. `WhatsAppTemplateDTO`. */
  async detail() {
    const { data } = await get('/admin/store/whatsapp-template');
    return data;
  },

  /** §9.13. Devuelve el DTO ya actualizado. */
  async update(payload) {
    const { data } = await put('/admin/store/whatsapp-template', payload);
    return data;
  },

  /** §9.13, `RN-61`. Restaura la plantilla por defecto y la devuelve. */
  async reset() {
    const { data } = await post('/admin/store/whatsapp-template/reset');
    return data;
  },
};
