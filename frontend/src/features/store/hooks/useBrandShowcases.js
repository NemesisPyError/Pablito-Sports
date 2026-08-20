import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/** Hook de marcas destacadas de la portada (05_API.md §7.2c). */
export function useBrandShowcases() {
  return useQuery({
    queryKey: ['brand-showcases'],
    queryFn: () => storeService.getBrandShowcases(),
  });
}
