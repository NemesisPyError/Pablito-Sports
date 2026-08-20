import { useMutation, useQueryClient } from '@tanstack/react-query';

import { PUBLIC_WHATSAPP_TEMPLATE_KEY } from '../../../store/hooks/usePublicWhatsAppTemplate.js';
import { STORE_SETTINGS_KEY } from '../../settings/hooks/useStoreSettings.js';
import { whatsappTemplateApi } from '../api/whatsappTemplateApi.js';
import { WHATSAPP_TEMPLATE_KEY } from './useWhatsappTemplate.js';

/** Restaura la plantilla por defecto (§9.13, `RN-61`). Mismas invalidaciones que guardar. */
export function useResetWhatsappTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => whatsappTemplateApi.reset(),
    onSuccess: (data) => {
      queryClient.setQueryData(WHATSAPP_TEMPLATE_KEY, data);
      queryClient.invalidateQueries({ queryKey: WHATSAPP_TEMPLATE_KEY });
      queryClient.invalidateQueries({ queryKey: STORE_SETTINGS_KEY });
      queryClient.invalidateQueries({ queryKey: PUBLIC_WHATSAPP_TEMPLATE_KEY });
    },
  });
}
