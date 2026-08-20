import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

/**
 * Hook del contenido institucional (05_API.md §7.2b).
 *
 * Los cuatro campos son opcionales: una respuesta con todos en nulo significa
 * que el administrador todavía no cargó la sección, no que haya un error.
 */
export function useStoreAbout() {
  return useQuery({
    queryKey: ['store-about'],
    queryFn: () => storeService.getAbout(),
  });
}
