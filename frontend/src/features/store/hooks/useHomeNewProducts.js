import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/** Clave de caché compartida con el panel: una alta o baja en Novedades
 * invalida esta consulta para que la vista previa no quede desactualizada
 * (`features/admin/products/hooks/useProductActions.js`). */
export const HOME_NEW_PRODUCTS_KEY = ['home-new-products'];

/**
 * Hook de Novedades para el home: la selección editorial del administrador.
 */
export function useHomeNewProducts() {
  return useQuery({
    queryKey: HOME_NEW_PRODUCTS_KEY,
    queryFn: () => storeService.getHomeNewProducts(),
  });
}
