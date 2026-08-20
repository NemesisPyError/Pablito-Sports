import { useMutation } from '@tanstack/react-query';

import { bannersApi } from '../api/bannersApi.js';
import { useBannerInvalidation } from './useBanners.js';

/**
 * Alta y edición (§9.11).
 *
 * Comparten mutación porque §10.13 define un solo juego de campos para
 * `BannerCreateDTO` y `BannerUpdateDTO`; la única diferencia es que en `PUT` la
 * imagen puede omitirse, y de eso ya se ocupa el `FormData` que llega armado.
 */
export function useSaveBanner() {
  const invalidar = useBannerInvalidation();

  return useMutation({
    mutationFn: ({ bannerId, formData }) =>
      bannerId ? bannersApi.update(bannerId, formData) : bannersApi.create(formData),
    onSuccess: (_data, { bannerId }) => invalidar(bannerId),
  });
}
