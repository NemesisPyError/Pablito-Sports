import { useQuery } from '@tanstack/react-query';

import { get } from '../../../../shared/services/apiClient.js';

/**
 * Sexos y tipos de talle (05_API.md §9.17, §9.18).
 *
 * **Solo lectura**: `S-06` y `S-07` los declaran datos semilla no
 * administrables. No hay ni habrá alta, edición ni baja, y por eso este hook no
 * expone mutaciones.
 *
 * Se leen de la API privada porque el panel necesita el identificador, que
 * `AD-12` prohíbe publicar y §4.8 admite aquí.
 */
export const SEED_DATA_KEY = ['admin', 'seed-data'];

async function listar(ruta) {
  const { data } = await get(`/admin/${ruta}?per_page=100`);
  return data ?? [];
}

export function useSeedData(enabled = true) {
  const generos = useQuery({
    queryKey: [...SEED_DATA_KEY, 'genders'],
    queryFn: () => listar('genders'),
    // Sólo cambian con una migración: no tiene sentido revalidarlos seguido.
    staleTime: 1000 * 60 * 30,
    enabled,
  });

  const tipos = useQuery({
    queryKey: [...SEED_DATA_KEY, 'size-types'],
    queryFn: () => listar('size-types'),
    staleTime: 1000 * 60 * 30,
    enabled,
  });

  return {
    genders: generos.data ?? [],
    sizeTypes: tipos.data ?? [],
    isLoading: generos.isLoading || tipos.isLoading,
    isError: generos.isError || tipos.isError,
    refetch: () => {
      generos.refetch();
      tipos.refetch();
    },
  };
}
