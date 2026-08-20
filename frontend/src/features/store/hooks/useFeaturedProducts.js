import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/**
 * Hook de productos destacados para el home.
 *
 * No recibe límite: cuántos se muestran lo decide el servidor a partir de
 * `store_settings.featured_products_count` (`RF-35`). La clave tampoco lo
 * lleva, porque ya no hay un límite del cliente que distinga una consulta de
 * otra.
 */
export function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featured-products'],
    queryFn: () => storeService.getFeaturedProducts(),
  });
}
