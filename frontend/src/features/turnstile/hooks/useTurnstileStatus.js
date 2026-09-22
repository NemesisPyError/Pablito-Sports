import { useQuery } from '@tanstack/react-query';

import { turnstileService } from '../services/turnstileService.js';

/**
 * Hook de estado de Turnstile (DEP-11: los componentes no importan
 * `useQuery` directamente).
 *
 * Se consulta una sola vez al entrar a la tienda — `TurnstileGate` vive por
 * encima de `PublicRoutes` y no se remonta al navegar entre rutas — así que
 * un usuario ya verificado no vuelve a ver el widget dentro de la misma
 * visita, aunque React Query reintente esta consulta en segundo plano.
 */
export function useTurnstileStatus() {
  return useQuery({
    queryKey: ['turnstile-status'],
    queryFn: () => turnstileService.getStatus(),
  });
}
