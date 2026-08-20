import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/**
 * Hook de configuración pública de la tienda.
 *
 * DEP-11: los componentes no importan useQuery directamente.
 */
export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: () => storeService.getSettings(),
  });
}
