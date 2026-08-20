import { useQuery } from '@tanstack/react-query';

import { catalogService } from '../services/catalogService.js';

/**
 * Hook de marcas para filtros.
 */
export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => catalogService.getBrands(),
  });
}
