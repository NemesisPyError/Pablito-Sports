import { get } from '../../../shared/services/apiClient.js';

/**
 * Servicio de catálogo público.
 */
/**
 * Quita del cuerpo de la consulta lo que no es un filtro.
 *
 * `false` **no significa «sin filtro»** para el backend: `parse_bool` lo lee
 * como una petición explícita de lo contrario, de modo que `on_sale=false`
 * devuelve solo los productos sin descuento (§7.3). Enviar los tres booleanos
 * apagados dejaba el catálogo mostrando únicamente los productos que no eran
 * ni oferta, ni novedad, ni destacado.
 *
 * Las cadenas vacías se omiten por la misma razón de higiene: el backend las
 * ignora, pero el cuerpo de la petición debe decir exactamente lo que se
 * quiso pedir.
 */
export function toQueryParams(filters) {
  return Object.fromEntries(
    Object.entries(filters ?? {}).filter(
      ([, valor]) => valor !== false && valor !== '' && valor !== null && valor !== undefined,
    ),
  );
}

export const catalogService = {
  /** GET /api/v1/products (05_API.md §7.3) */
  async getProducts(filters) {
    const { data, meta } = await get('/products', { params: toQueryParams(filters) });
    return { products: data ?? [], meta: meta ?? {} };
  },

  /** GET /api/v1/categories (05_API.md §7.5) */
  async getCategories() {
    const { data } = await get('/categories');
    return data ?? [];
  },

  /** GET /api/v1/brands (05_API.md §7.6) */
  async getBrands() {
    const { data } = await get('/brands');
    return data ?? [];
  },

  /** GET /api/v1/sports (05_API.md §7.7) */
  async getSports() {
    const { data } = await get('/sports');
    return data ?? [];
  },

  /** GET /api/v1/sizes (05_API.md §7.9) */
  async getSizes() {
    const { data } = await get('/sizes');
    return data ?? [];
  },
};
