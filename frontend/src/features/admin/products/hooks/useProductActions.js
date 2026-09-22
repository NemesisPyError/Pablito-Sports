import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get } from '../../../../shared/services/apiClient.js';
import { HOME_NEW_PRODUCTS_KEY } from '../../../store/hooks/useHomeNewProducts.js';
import { DASHBOARD_KEY } from '../../dashboard/hooks/useDashboard.js';
import { adminProductsApi } from '../api/productsApi.js';
import { ADMIN_PRODUCTS_KEY } from './useAdminProducts.js';

export const ADMIN_PRODUCT_KEY = (productId) => ['admin', 'product', productId];

/** Detalle de producto (§9.3). `ProductAdminDTO`. */
export function useAdminProduct(productId) {
  return useQuery({
    queryKey: ADMIN_PRODUCT_KEY(productId),
    queryFn: () => adminProductsApi.detail(productId),
    enabled: Boolean(productId),
  });
}

/**
 * Invalida todo lo que una escritura de producto puede haber dejado obsoleto.
 *
 * El dashboard entra en la lista porque sus totales cuentan activos, ocultos,
 * disponibilidad y ofertas (`RF-38`): activar o eliminar un producto cambia
 * esos números.
 */
function useProductInvalidation() {
  const queryClient = useQueryClient();

  return (productId) => {
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    if (productId) {
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(productId) });
    }
  };
}

/** §9.3 `POST /products/{id}/set-active`. */
export function useSetProductActive() {
  const invalidar = useProductInvalidation();

  return useMutation({
    mutationFn: ({ productId, isActive }) => adminProductsApi.setActive(productId, isActive),
    onSuccess: (_data, { productId }) => invalidar(productId),
  });
}

/**
 * §9.3 `POST /products/{id}/set-home-new`. Alta y baja en Novedades.
 *
 * Además de lo que invalida cualquier escritura de producto, refresca la
 * vista previa pública de Novedades (`useHomeNewProducts`): sin esto, el
 * carrusel del home seguiría mostrando la selección anterior hasta el
 * próximo refetch espontáneo.
 */
export function useSetProductHomeNew() {
  const invalidar = useProductInvalidation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, selected }) => adminProductsApi.setHomeNew(productId, selected),
    onSuccess: (_data, { productId }) => {
      invalidar(productId);
      queryClient.invalidateQueries({ queryKey: HOME_NEW_PRODUCTS_KEY });
    },
  });
}

/** §9.3 `DELETE /products/{id}`. Borrado lógico (`AD-18`). */
export function useDeleteProduct() {
  const invalidar = useProductInvalidation();

  return useMutation({
    mutationFn: (productId) => adminProductsApi.remove(productId),
    onSuccess: (_data, productId) => invalidar(productId),
  });
}

/**
 * Marcas y categorías para los filtros.
 *
 * Se leen de los endpoints **administrativos** (§9.6, §9.5): los públicos no
 * incluyen las entidades inactivas, y el panel debe poder filtrar por ellas.
 * El filtro viaja por `slug` (`AD-23`), que ambos DTO traen.
 */
export function useFilterOptions() {
  const brands = useQuery({
    queryKey: ['admin', 'brands', 'options'],
    queryFn: async () => (await get('/admin/brands?per_page=100')).data ?? [],
    staleTime: 1000 * 60 * 5,
  });

  const categories = useQuery({
    queryKey: ['admin', 'categories', 'options'],
    queryFn: async () => (await get('/admin/categories?per_page=100')).data ?? [],
    staleTime: 1000 * 60 * 5,
  });

  return {
    brands: brands.data ?? [],
    categories: categories.data ?? [],
    isLoading: brands.isLoading || categories.isLoading,
  };
}

/**
 * Alta y edición (§9.3).
 *
 * Comparten mutación: §10.4 define un solo juego de campos y `PUT` reemplaza el
 * recurso completo, de modo que el payload es el mismo.
 */
export function useSaveProduct() {
  const invalidar = useProductInvalidation();

  return useMutation({
    mutationFn: ({ productId, payload }) =>
      productId ? adminProductsApi.update(productId, payload) : adminProductsApi.create(payload),
    onSuccess: (_data, { productId }) => invalidar(productId),
  });
}
