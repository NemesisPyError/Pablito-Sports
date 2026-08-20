import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DASHBOARD_KEY } from '../../dashboard/hooks/useDashboard.js';
import { adminProductsApi } from '../api/productsApi.js';
import { ADMIN_PRODUCTS_KEY } from './useAdminProducts.js';
import { ADMIN_PRODUCT_KEY } from './useProductActions.js';

export const PRODUCT_IMAGES_KEY = (productId) => ['admin', 'product', productId, 'images'];
export const PRODUCT_VARIANTS_KEY = (productId) => ['admin', 'product', productId, 'variants'];

function useMediaInvalidation(productId) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: PRODUCT_IMAGES_KEY(productId) });
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(productId) });
    // El listado muestra `has_image`, y el dashboard cuenta los productos sin
    // imagen como incompletos (`RF-39`): ambos quedan obsoletos.
    queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };
}

// --- Imágenes (§9.3) ----------------------------------------------------

export function useProductImages(productId) {
  return useQuery({
    queryKey: PRODUCT_IMAGES_KEY(productId),
    queryFn: () => adminProductsApi.listImages(productId),
    enabled: Boolean(productId),
  });
}

export function useUploadImage(productId) {
  const invalidar = useMediaInvalidation(productId);

  return useMutation({
    mutationFn: (archivo) => adminProductsApi.uploadImage(productId, { file: archivo }),
    onSuccess: invalidar,
  });
}

export function useSetPrimaryImage(productId) {
  const invalidar = useMediaInvalidation(productId);

  return useMutation({
    mutationFn: (imageId) => adminProductsApi.setPrimaryImage(productId, imageId),
    onSuccess: invalidar,
  });
}

export function useDeleteImage(productId) {
  const invalidar = useMediaInvalidation(productId);

  return useMutation({
    mutationFn: (imageId) => adminProductsApi.removeImage(productId, imageId),
    onSuccess: invalidar,
  });
}

// --- Variantes (§9.4) ---------------------------------------------------

export function useProductVariants(productId) {
  return useQuery({
    queryKey: PRODUCT_VARIANTS_KEY(productId),
    queryFn: () => adminProductsApi.listVariants(productId),
    enabled: Boolean(productId),
  });
}

/**
 * Carga la cantidad real de una variante (§9.4, v1.4.0).
 *
 * `RN-38b`: recalcula la disponibilidad del producto en el servidor, así que
 * hay que invalidar también la ficha del producto, no solo el listado de
 * variantes.
 */
export function useUpdateVariantQuantity(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, quantity }) =>
      adminProductsApi.updateVariantQuantity(productId, variantId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_VARIANTS_KEY(productId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(productId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    },
  });
}

/**
 * Registra una venta sobre una variante (RN-82).
 *
 * A diferencia de `useUpdateVariantQuantity`, que reemplaza el número a mano,
 * esto descuenta y el servidor puede rechazarlo (`409`) si la cantidad supera
 * el stock cargado. Mismas invalidaciones: también recalcula disponibilidad.
 */
export function useRegisterSale(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ variantId, quantity }) =>
      adminProductsApi.registerSale(productId, variantId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_VARIANTS_KEY(productId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(productId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
    },
  });
}

/**
 * Elimina una variante concreta (§9.4).
 *
 * No hay alta ni edición: `AD-15` las genera al reconciliar los talles
 * del producto. Este borrado existe para el caso que §9.4 contempla
 * —*"eliminar variantes específicas si el negocio lo requiere"*—, no para
 * gestionarlas una a una.
 */
export function useDeleteVariant(productId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variantId) => adminProductsApi.removeVariant(productId, variantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_VARIANTS_KEY(productId) });
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(productId) });
    },
  });
}

/**
 * Reordena la galería (§9.3).
 *
 * Sin arrastrar y soltar: mover una imagen una posición arriba o abajo cubre el
 * caso sin añadir dependencias, y funciona con teclado y en móvil, donde el
 * arrastre es el peor gesto posible.
 */
export function useReorderImages(productId) {
  const invalidar = useMediaInvalidation(productId);

  return useMutation({
    mutationFn: (imageIds) => adminProductsApi.reorderImages(productId, imageIds),
    onSuccess: invalidar,
  });
}
