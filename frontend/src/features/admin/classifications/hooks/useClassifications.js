import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DASHBOARD_KEY } from '../../dashboard/hooks/useDashboard.js';
import { classificationsApi } from '../api/classificationsApi.js';

export const CLASSIFICATION_KEY = (recurso) => ['admin', 'classification', recurso];

/**
 * Listado completo del recurso.
 *
 * §4.4 acota `per_page` a 100 y las clasificaciones de una tienda caben de
 * sobra. Si alguna creciera más, la pantalla lo advierte en lugar de mostrar
 * una parte en silencio.
 */
export function useClassifications(recurso) {
  return useQuery({
    queryKey: CLASSIFICATION_KEY(recurso),
    queryFn: () => classificationsApi.list(recurso, { perPage: 100 }),
    enabled: Boolean(recurso),
  });
}

export function useClassification(recurso, id) {
  return useQuery({
    queryKey: [...CLASSIFICATION_KEY(recurso), id],
    queryFn: () => classificationsApi.detail(recurso, id),
    enabled: Boolean(recurso && id),
  });
}

/**
 * Invalida lo que una escritura deja obsoleto.
 *
 * El formulario de producto consume estas mismas listas como opciones, y el
 * dashboard cuenta productos incompletos por categoría (`RF-39`): crear o
 * eliminar una clasificación cambia lo que ambos muestran.
 */
function useClassificationInvalidation(recurso) {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: CLASSIFICATION_KEY(recurso) });
    queryClient.invalidateQueries({ queryKey: ['admin', 'options'] });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
  };
}

/** Alta y edición comparten mutación: el juego de campos es el mismo. */
export function useSaveClassification(recurso) {
  const invalidar = useClassificationInvalidation(recurso);

  return useMutation({
    mutationFn: ({ id, payload }) =>
      id
        ? classificationsApi.update(recurso, id, payload)
        : classificationsApi.create(recurso, payload),
    onSuccess: invalidar,
  });
}

export function useDeleteClassification(recurso) {
  const invalidar = useClassificationInvalidation(recurso);

  return useMutation({
    mutationFn: (id) => classificationsApi.remove(recurso, id),
    onSuccess: invalidar,
  });
}

export function useRestoreClassification(recurso) {
  const invalidar = useClassificationInvalidation(recurso);

  return useMutation({
    mutationFn: (id) => classificationsApi.restore(recurso, id),
    onSuccess: invalidar,
  });
}
