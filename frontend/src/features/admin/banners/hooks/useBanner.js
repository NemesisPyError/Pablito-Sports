import { useQuery } from '@tanstack/react-query';

import { bannersApi } from '../api/bannersApi.js';
import { ADMIN_BANNER_KEY } from './useBanners.js';

/** Detalle de un banner (§9.11). `BannerAdminDTO`. */
export function useBanner(bannerId) {
  return useQuery({
    queryKey: ADMIN_BANNER_KEY(bannerId),
    queryFn: () => bannersApi.detail(bannerId),
    enabled: Boolean(bannerId),
  });
}
