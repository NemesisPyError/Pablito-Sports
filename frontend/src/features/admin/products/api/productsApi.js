import { del, get, post, put } from '../../../../shared/services/apiClient.js';

/**
 * Productos del panel (05_API.md §9.3, §9.4).
 *
 * El alta y la edición ya son posibles: §9.17 y §9.18 publican los
 * identificadores de sexo y tipo de talle que `ProductCreateDTO` exige y que la
 * API pública no expone (`AD-12`, §4.8).
 */
export const adminProductsApi = {
  /** §9.3. `brand` y `category` viajan como **slug** (`AD-23`), no como id. */
  async list(filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.category) params.set('category', filters.category);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.is_active !== '') params.set('is_active', filters.is_active);
    if (filters.sort) params.set('sort', filters.sort);
    params.set('page', String(filters.page ?? 1));
    params.set('per_page', String(filters.per_page ?? 20));

    const { data, meta } = await get(`/admin/products?${params.toString()}`);
    return { items: data ?? [], meta };
  },

  /** §9.3. `ProductAdminDTO`. */
  async detail(productId) {
    const { data } = await get(`/admin/products/${productId}`);
    return data;
  },

  /** §9.3. `ProductCreateDTO`; responde 201 con `ProductAdminDTO`. */
  async create(payload) {
    const { data } = await post('/admin/products', payload);
    return data;
  },

  /**
   * §9.3. `PUT` reemplaza el recurso completo: el payload lleva todos los
   * campos obligatorios, no sólo los que cambiaron.
   */
  async update(productId, payload) {
    const { data } = await put(`/admin/products/${productId}`, payload);
    return data;
  },

  /** §9.3. Activa o desactiva sin tocar el resto del producto. */
  async setActive(productId, isActive) {
    const { data } = await post(`/admin/products/${productId}/set-active`, {
      is_active: isActive,
    });
    return data;
  },

  /** §9.3. Agrega o quita el producto de Novedades sin tocar el resto. */
  async setHomeNew(productId, selected) {
    const { data } = await post(`/admin/products/${productId}/set-home-new`, { selected });
    return data;
  },

  /** §9.3. Borrado lógico (`AD-18`), responde 204. */
  async remove(productId) {
    await del(`/admin/products/${productId}`);
  },

  // --- Variantes (§9.4) -------------------------------------------------
  //
  // No hay alta ni edición de la combinación color/talle: §9.4 dice que las
  // variantes *"se generan y reconcilian automáticamente"* (`AD-15`). Desde
  // v1.4.0 sí se puede cargar la cantidad real de cada una (`RN-38b`).

  async listVariants(productId) {
    const { data } = await get(`/admin/products/${productId}/variants`);
    return data ?? [];
  },

  /** §9.4 (v1.4.0). Recalcula la disponibilidad del producto en el servidor. */
  async updateVariantQuantity(productId, variantId, quantity) {
    const { data } = await put(`/admin/products/${productId}/variants/${variantId}`, {
      quantity,
    });
    return data;
  },

  async removeVariant(productId, variantId) {
    await del(`/admin/products/${productId}/variants/${variantId}`);
  },

  /** RN-82: descuenta `quantity` de la variante y recalcula disponibilidad. */
  async registerSale(productId, variantId, quantity) {
    const { data } = await post(`/admin/products/${productId}/variants/${variantId}/sales`, {
      quantity,
    });
    return data;
  },

  /**
   * §9.19: venta manual de una o varias líneas, en una sola transacción.
   *
   * Cada línea lleva su `unit_price` explícito: es el precio que el
   * administrador vio y confirmó en el resumen. El backend acepta omitirlo y
   * usar el vigente, pero entonces el total confirmado y el registrado podrían
   * no coincidir si el precio cambia entre que se abre el modal y se confirma.
   */
  async registerManualSale(items) {
    const { data } = await post('/admin/sales', { items });
    return data;
  },

  // --- Imágenes (§9.3) --------------------------------------------------

  async listImages(productId) {
    const { data } = await get(`/admin/products/${productId}/images`);
    return data ?? [];
  },

  /**
   * Carga una imagen. `multipart/form-data`, campo `file` (§9.3).
   *
   * El `Content-Type` se deja sin fijar: el navegador debe añadir el `boundary`
   * del multipart, y pasarlo a mano lo rompería.
   */
  async uploadImage(productId, { file, altText, isPrimary }) {
    const formData = new FormData();
    formData.append('file', file);
    if (altText) formData.append('alt_text', altText);
    if (isPrimary) formData.append('is_primary', 'true');

    const { data } = await post(`/admin/products/${productId}/images`, formData, {
      headers: { 'Content-Type': undefined },
    });
    return data;
  },

  async setPrimaryImage(productId, imageId) {
    const { data } = await post(`/admin/products/${productId}/images/${imageId}/set-primary`);
    return data;
  },

  async removeImage(productId, imageId) {
    await del(`/admin/products/${productId}/images/${imageId}`);
  },

  /**
   * §9.3. Reordena la galería enviando los identificadores en el orden deseado.
   *
   * El orden es del conjunto, no de una imagen suelta: mover una desplaza a las
   * demás, así que el contrato recibe la lista completa.
   */
  async reorderImages(productId, imageIds) {
    const { data } = await post(`/admin/products/${productId}/images/reorder`, {
      image_ids: imageIds,
    });
    return data;
  },
};
