import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PUBLIC_WHATSAPP_TEMPLATE_KEY } from '../../../store/hooks/usePublicWhatsAppTemplate.js';
import { STORE_SETTINGS_KEY } from '../../settings/hooks/useStoreSettings.js';
import { whatsappTemplateApi } from '../api/whatsappTemplateApi.js';
import { WHATSAPP_TEMPLATE_KEY } from './useWhatsappTemplate.js';

/**
 * Guarda la plantilla (§9.13).
 *
 * `message_template`/`item_template` son las mismas columnas que expone
 * `StoreSettingsAdminDTO` (§9.12): se invalida también `STORE_SETTINGS_KEY`
 * para que la pantalla de Configuración no reenvíe, sin darse cuenta, el
 * valor viejo que traía cargado desde antes de este guardado. `RN-59` exige
 * además que el catálogo público vea la misma plantilla que el panel.
 */
export function useSaveWhatsappTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => whatsappTemplateApi.update(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(WHATSAPP_TEMPLATE_KEY, data);
      queryClient.invalidateQueries({ queryKey: WHATSAPP_TEMPLATE_KEY });
      queryClient.invalidateQueries({ queryKey: STORE_SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_WHATSAPP_TEMPLATE_KEY });
    },
  });
}
