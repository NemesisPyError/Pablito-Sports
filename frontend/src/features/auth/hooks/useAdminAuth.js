import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { setUnauthorizedHandler } from '../../../shared/services/apiClient.js';
import { authApi } from '../api/authApi.js';

export const ADMIN_SESSION_KEY = ['admin', 'session'];

/**
 * Sesión del panel.
 *
 * La sesión es **estado del servidor**, no del cliente: `AD-37` la guarda allí y
 * `/auth/me` es su única fuente de verdad. Por eso vive en React Query, como el
 * resto del estado remoto, y no en un store aparte que habría que mantener
 * sincronizado.
 */
export function useAdminAuth() {
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: () => authApi.me(),
    // Un 401 es la respuesta legítima de "no hay sesión", no un fallo que
    // merezca reintento.
    retry: false,
    staleTime: 1000 * 60,
  });

  const administrator = session.data ?? null;
  const isUnauthorized = session.isError && session.error?.status === 401;

  return {
    administrator,
    isAuthenticated: Boolean(administrator),
    isLoading: session.isLoading,
    // Un fallo de red no es lo mismo que no tener sesión: el primero se puede
    // reintentar, el segundo obliga a volver al login.
    isUnauthorized,
    isError: session.isError && !isUnauthorized,
    refetch: session.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ADMIN_SESSION_KEY }),
    clear: () => queryClient.setQueryData(ADMIN_SESSION_KEY, null),
  };
}

/** Mutación de acceso. Al entrar se refresca la sesión desde el servidor. */
export function useAdminLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials) => authApi.login(credentials),
    onSuccess: (administrator) => {
      queryClient.setQueryData(ADMIN_SESSION_KEY, administrator);
    },
  });
}

/** Mutación de salida. Vacía toda la caché: nada del panel debe sobrevivir. */
export function useAdminLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.setQueryData(ADMIN_SESSION_KEY, null);
      queryClient.clear();
    },
  });
}

/**
 * Conecta el `401` global del cliente HTTP con la caché de sesión.
 *
 * Se registra una sola vez, en la raíz del panel: cualquier petición que reciba
 * `401` deja la sesión en `null` y el guardián se encarga de redirigir. Ninguna
 * pantalla necesita comprobarlo por su cuenta.
 */
export function useUnauthorizedRedirect() {
  const queryClient = useQueryClient();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      queryClient.setQueryData(ADMIN_SESSION_KEY, null);
    });
    return () => setUnauthorizedHandler(null);
  }, [queryClient]);
}
