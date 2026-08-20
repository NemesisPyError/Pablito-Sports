import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/**
 * Hook de banners activos y vigentes de una zona de la portada (§7.2).
 *
 * La zona forma parte de la clave: hero, novedades y promociones son consultas
 * distintas y no deben compartir caché.
 */
export function useBanners(placement) {
  return useQuery({
    queryKey: ['banners', placement ?? 'all'],
    queryFn: () => storeService.getBanners(placement),
  });
}
