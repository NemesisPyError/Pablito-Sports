import { post } from '../../../shared/services/apiClient.js';

/**
 * Comunicación con la API del carrito.
 *
 * Ningún componente llama a la API directamente (DEP-10).
 */
export const cartService = {
  /**
   * POST /api/v1/cart/revalidate (05_API.md §8).
   *
   * AD-36: se envían identidades y cantidades, nunca precios.
   */
  async revalidate({ contentVersion, items }) {
    const { data, meta } = await post('/cart/revalidate', {
      cart_content_version: contentVersion,
      items: items.map((item) => ({ variant_id: item.variant_id, quantity: item.quantity })),
    });
    return { items: data.items, contentVersion: meta.cart_content_version };
  },
};
