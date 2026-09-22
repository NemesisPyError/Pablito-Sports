import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/** Hook de bancos activos de Superdescuentos, mismo criterio que `useBanners`. */
export function useBanks() {
  return useQuery({
    queryKey: ['banks'],
    queryFn: () => storeService.getBanks(),
  });
}
