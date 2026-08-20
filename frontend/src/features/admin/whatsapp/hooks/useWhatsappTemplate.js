import { useQuery } from '@tanstack/react-query';

import { whatsappTemplateApi } from '../api/whatsappTemplateApi.js';

export const WHATSAPP_TEMPLATE_KEY = ['admin-whatsapp-template'];

/** Plantilla vigente del panel (§9.13). `WhatsAppTemplateDTO`. */
export function useWhatsappTemplate() {
  return useQuery({
    queryKey: WHATSAPP_TEMPLATE_KEY,
    queryFn: () => whatsappTemplateApi.detail(),
  });
}
