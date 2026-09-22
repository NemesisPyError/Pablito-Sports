import { useQuery } from '@tanstack/react-query';

import { catalogService } from '../services/catalogService.js';

/**
 * Hook de deportes para filtros y el eje `DEPORTES` del navbar.
 */
export function useSports() {
  return useQuery({
    queryKey: ['sports'],
    queryFn: () => catalogService.getSports(),
  });
}
