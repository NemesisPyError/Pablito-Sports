import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi } from '../api/usersApi.js';

export const ADMIN_USERS_KEY = ['admin', 'users'];
export const ADMIN_USER_KEY = (userId) => ['admin', 'user', userId];

// §9.14 no define filtros y `per_page` está acotado a 100 (§4.4). Los
// administradores son un puñado, así que un solo pedido alcanza; si en el
// futuro no alcanzara, la pantalla lo advierte en lugar de mentir en silencio.
const PER_PAGE = 100;

/** Listado de administradores (§9.14). Array de `AdministratorDTO`. */
export function useUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: () => usersApi.list({ perPage: PER_PAGE }),
  });
}

/** Detalle (§9.14). `AdministratorDTO`. */
export function useUser(userId) {
  return useQuery({
    queryKey: ADMIN_USER_KEY(userId),
    queryFn: () => usersApi.detail(userId),
    enabled: Boolean(userId),
  });
}

function useUsersInvalidation() {
  const queryClient = useQueryClient();
  return (userId) => {
    queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    if (userId) queryClient.invalidateQueries({ queryKey: ADMIN_USER_KEY(userId) });
  };
}

/** Alta y edición comparten mutación: §10.10 define un juego de campos por caso. */
export function useSaveUser() {
  const invalidar = useUsersInvalidation();
  return useMutation({
    mutationFn: ({ userId, payload }) =>
      userId ? usersApi.update(userId, payload) : usersApi.create(payload),
    onSuccess: (_data, { userId }) => invalidar(userId),
  });
}

export function useDeleteUser() {
  const invalidar = useUsersInvalidation();
  return useMutation({
    mutationFn: (userId) => usersApi.remove(userId),
    onSuccess: (_data, userId) => invalidar(userId),
  });
}

/**
 * Cambio de contraseña (§9.14).
 *
 * Cuando el objetivo es la sesión en curso, el backend la invalida (§7.3): el
 * consumidor detecta ese caso por `userId` y lleva al login en lugar de
 * refrescar datos con una sesión ya muerta.
 */
export function useChangePassword() {
  const invalidar = useUsersInvalidation();
  return useMutation({
    mutationFn: ({ userId, currentPassword, newPassword }) =>
      usersApi.changePassword(userId, { currentPassword, newPassword }),
    onSuccess: (_data, { userId, isSelf }) => {
      if (!isSelf) invalidar(userId);
    },
  });
}
