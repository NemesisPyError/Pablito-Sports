import { useQuery } from '@tanstack/react-query';

import { productsService } from '../services/productsService.js';

/**
 * Hook de detalle de producto.
 */
export function useProduct(slug) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => productsService.getProduct(slug),
    enabled: Boolean(slug),
  });
}
