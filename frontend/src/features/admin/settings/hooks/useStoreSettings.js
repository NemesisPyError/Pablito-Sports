import { useQuery } from '@tanstack/react-query';

import { settingsApi } from '../api/settingsApi.js';

export const STORE_SETTINGS_KEY = ['settings'];

/**
 * Clave del catálogo público (`features/store/hooks/useStoreSettings.js`).
 *
 * Se importa como constante y no se repite el literal en cada invalidación: si
 * la pantalla pública cambiara de clave, este es el único punto a tocar.
 *
 * La clave del panel es `['settings']` y **no** `['store-settings']`: esta
 * última ya identifica la lectura pública, que devuelve otro DTO
 * (`StoreSettingsPublicDTO`, §10.2, sin plantillas ni contador). Compartirla
 * haría que una pantalla leyera de la caché de la otra.
 */
export const PUBLIC_STORE_SETTINGS_KEY = ['store-settings'];

/** Configuración completa del panel (§9.12). `StoreSettingsAdminDTO`. */
export function useStoreSettings() {
  return useQuery({
    queryKey: STORE_SETTINGS_KEY,
    queryFn: () => settingsApi.detail(),
  });
}
