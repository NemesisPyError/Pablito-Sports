import { useMutation } from '@tanstack/react-query';

import { bannersApi } from '../api/bannersApi.js';
import { useBannerInvalidation } from './useBanners.js';

/**
 * Borrado lógico (§9.11, `AD-18`).
 *
 * El archivo de imagen no se toca: `AD-39` acota la limpieza física a los
 * archivos sin fila, y la fila sigue existiendo.
 */
export function useDeleteBanner() {
  const invalidar = useBannerInvalidation();

  return useMutation({
    mutationFn: (bannerId) => bannersApi.remove(bannerId),
    onSuccess: (_data, bannerId) => invalidar(bannerId),
  });
}
