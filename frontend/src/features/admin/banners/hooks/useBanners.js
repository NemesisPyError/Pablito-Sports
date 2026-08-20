import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';

import { bannersApi } from '../api/bannersApi.js';

/**
 * Claves de React Query del módulo.
 *
 * Viven aquí, junto al listado, para que el resto de los hooks las importen de
 * un solo sitio y no haya dos literales que se puedan desincronizar.
 */
export const ADMIN_BANNERS_KEY = ['admin-banners'];
export const ADMIN_BANNER_KEY = (bannerId) => ['admin-banner', bannerId];

export const BANNERS_PER_PAGE = 20;

/**
 * Listado paginado (§9.11).
 *
 * La paginación es **del servidor**: se pide la página que se muestra y se usa
 * el `meta` que vuelve. `keepPreviousData` evita que la tabla parpadee a vacío
 * mientras llega la página siguiente.
 */
export function useBanners(page = 1) {
  return useQuery({
    queryKey: [...ADMIN_BANNERS_KEY, { page }],
    queryFn: () => bannersApi.list({ page, perPage: BANNERS_PER_PAGE }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Invalida lo que una escritura de banner deja obsoleto.
 *
 * `ADMIN_BANNERS_KEY` es prefijo de la clave de cada página, así que invalidarla
 * alcanza a todas: cambiar la posición de un banner puede moverlo de página.
 *
 * El dashboard **no** entra: §10.8 no expone ninguna métrica de banners, a
 * diferencia de las promociones, que alimentan `totals.on_sale`.
 */
export function useBannerInvalidation() {
  const queryClient = useQueryClient();

  return (bannerId) => {
    queryClient.invalidateQueries({ queryKey: ADMIN_BANNERS_KEY });
    if (bannerId) {
      queryClient.invalidateQueries({ queryKey: ADMIN_BANNER_KEY(bannerId) });
    }
  };
}
