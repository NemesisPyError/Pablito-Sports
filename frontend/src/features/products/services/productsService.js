import { get } from '../../../shared/services/apiClient.js';

/**
 * Servicio de ficha de producto.
 */
export const productsService = {
  /** GET /api/v1/products/{slug} (05_API.md §7.4) */
  async getProduct(slug) {
    const { data } = await get(`/products/${slug}`);
    return data;
  },
};
