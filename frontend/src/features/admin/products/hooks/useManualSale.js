import { useMutation, useQueryClient } from '@tanstack/react-query';

import { DASHBOARD_KEY } from '../../dashboard/hooks/useDashboard.js';
import { adminProductsApi } from '../api/productsApi.js';
import { ADMIN_PRODUCTS_KEY } from './useAdminProducts.js';
import { ADMIN_PRODUCT_KEY } from './useProductActions.js';
import { PRODUCT_VARIANTS_KEY } from './useProductMedia.js';

/**
 * Venta manual de una o varias líneas (§9.19).
 *
 * **Sin actualización optimista, a propósito.** Una venta puede tocar varios
 * productos y el servidor es el único que sabe cómo terminó cada stock: puede
 * rechazarla entera por una línea, y entre que se abrió el modal y se confirmó
 * pudo venderse otra unidad desde otra pantalla. Pintar un número adivinado y
 * corregirlo después dejaría al administrador mirando un stock que nunca
 * existió. Se invalida y se vuelve a leer.
 *
 * Se invalidan las variantes de **cada** producto vendido, no solo del primero:
 * una venta multiproducto deja obsoletas todas sus fichas.
 */
export function useRegisterManualSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items) => adminProductsApi.registerManualSale(items),
    onSuccess: (_venta, items) => {
      for (const productId of new Set(items.map((item) => item.product_id))) {
        queryClient.invalidateQueries({ queryKey: PRODUCT_VARIANTS_KEY(productId) });
        queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCT_KEY(productId) });
      }
      queryClient.invalidateQueries({ queryKey: ADMIN_PRODUCTS_KEY });
      // El dashboard cuenta disponibilidad: vender puede dejar un producto
      // agotado y mover esos totales.
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    },
  });
}
