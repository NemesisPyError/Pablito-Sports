import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PUBLIC_WHATSAPP_TEMPLATE_KEY } from '../../../store/hooks/usePublicWhatsAppTemplate.js';
import { WHATSAPP_TEMPLATE_KEY } from '../../whatsapp/hooks/useWhatsappTemplate.js';
import { settingsApi } from '../api/settingsApi.js';
import { PUBLIC_STORE_SETTINGS_KEY, STORE_SETTINGS_KEY } from './useStoreSettings.js';

/**
 * Guarda la configuración (§9.12).
 *
 * Invalida además la lectura pública: `store_name`, `whatsapp_number`,
 * `address`, `business_hours` y `social_links` viajan también en
 * `StoreSettingsPublicDTO` (§10.2), de modo que editarlos deja obsoleto lo que
 * el catálogo tiene en caché dentro de la misma sesión del navegador.
 *
 * Esta pantalla no edita `message_template`/`item_template` (§14.7), pero el
 * `PUT` reemplaza el recurso completo y los reenvía tal como los cargó
 * (`toPayload` en `settingsForm.js`). Se invalidan también sus lecturas
 * (§9.13 y la pública) para que no queden mostrando un valor que este envío
 * acaba de pisar sin que el administrador lo haya tocado a propósito.
 *
 * El dashboard **no** se invalida: §10.8 no expone ninguna métrica derivada de
 * la configuración, así que no hay nada que refrescar allí.
 */
export function useSaveStoreSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => settingsApi.update(payload),
    onSuccess: (data) => {
      // El `PUT` ya devuelve el recurso actualizado: se siembra la caché con él
      // para que la pantalla no parpadee mientras se refetchea.
      queryClient.setQueryData(STORE_SETTINGS_KEY, data);
      queryClient.invalidateQueries({ queryKey: STORE_SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_STORE_SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: WHATSAPP_TEMPLATE_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_WHATSAPP_TEMPLATE_KEY });
    },
  });
}
