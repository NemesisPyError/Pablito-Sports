import { get } from '../../../shared/services/apiClient.js';

/**
 * Servicio de configuración pública de la tienda y banners.
 */
export const storeService = {
  /** GET /api/v1/store/settings (05_API.md §7.1) */
  async getSettings() {
    const { data } = await get('/store/settings');
    return data;
  },

  /**
   * GET /api/v1/store/whatsapp-template (`RN-59`).
   *
   * Recurso aparte y no un campo de `/store/settings`: §10.2 fija ese DTO con
   * cinco campos exactos y `AD-12` gobierna el contrato público.
   */
  async getWhatsAppTemplate() {
    const { data } = await get('/store/whatsapp-template');
    return data;
  },

  /**
   * GET /api/v1/banners (05_API.md §7.2).
   *
   * `placement` acota la zona de la portada —`hero`, `news` o `promo`—. Sin él
   * se devuelven todas, que es el comportamiento anterior al parámetro.
   */
  async getBanners(placement) {
    const { data } = await get('/banners', placement ? { params: { placement } } : undefined);
    return data ?? [];
  },

  /**
   * GET /api/v1/banks. Superdescuentos: bancos activos, ordenados por posición.
   */
  async getBanks() {
    const { data } = await get('/banks');
    return data ?? [];
  },

  /**
   * GET /api/v1/store/about (05_API.md §7.2b).
   *
   * Recurso propio y no un campo de `/store/settings`: `AD-12` congela ese DTO
   * en cinco campos, y es el mismo criterio con el que se resolvió la
   * plantilla de WhatsApp.
   */
  async getAbout() {
    const { data } = await get('/store/about');
    return data;
  },

  /**
   * GET /api/v1/store/brand-showcases (05_API.md §7.2c).
   *
   * Marcas con bloque propio en la portada: las que tienen `home_position`.
   * No se paginan porque son una selección curada por el administrador, no un
   * listado del catálogo.
   */
  async getBrandShowcases() {
    const { data } = await get('/store/brand-showcases');
    return data ?? [];
  },

  /**
   * GET /api/v1/products?is_featured=true (06_FRONTEND.md §6.1).
   *
   * **Sin `per_page`** a propósito: cuántos destacados se publican lo decide
   * `store_settings.featured_products_count`, que el administrador edita en el
   * panel. Ese ajuste no viaja en `StoreSettingsPublicDTO` (§10.2), así que lo
   * aplica el servidor al paginar. Mandar un tamaño desde aquí volvería a
   * ignorar la configuración, que es justo lo que se quería arreglar.
   */
  async getFeaturedProducts() {
    const { data } = await get('/products', { params: { is_featured: true } });
    return data ?? [];
  },

  /**
   * GET /api/v1/products/home-new (05_API.md §7.2d).
   *
   * Novedades: productos que el administrador sumó a mano desde el panel, en
   * el orden en que los fue seleccionando. No es `is_new` — ese campo sigue
   * siendo el autotoggle por producto que alimenta la insignia "Nuevo" y el
   * filtro del catálogo, sin curaduría ni orden propios.
   */
  async getHomeNewProducts() {
    const { data } = await get('/products/home-new');
    return data ?? [];
  },
};
