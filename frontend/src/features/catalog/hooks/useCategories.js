import { useQuery } from '@tanstack/react-query';

import { catalogService } from '../services/catalogService.js';

/**
 * Hook de árbol de categorías.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogService.getCategories(),
  });
}
