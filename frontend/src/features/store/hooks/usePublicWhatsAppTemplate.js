import { useQuery } from '@tanstack/react-query';

import { storeService } from '../services/storeService.js';

export const PUBLIC_WHATSAPP_TEMPLATE_KEY = ['public-whatsapp-template'];

/**
 * Plantilla vigente del mensaje de WhatsApp (`RN-59`).
 *
 * DEP-11: los componentes no importan `useQuery` directamente.
 *
 * **No** reintenta ni bloquea: si la petición falla, `buildMessage` compone con
 * la plantilla por defecto (`withDefaults`, `RN-61`). Que el cliente no pueda
 * generar su consulta porque la tienda no respondió sería peor que enviarla con
 * el texto por defecto.
 *
 * La plantilla cambia poco y se lee en cada visita al carrito: media hora de
 * `staleTime` evita una petición por navegación sin llegar a servir un texto
 * viejo si el administrador la edita.
 */
export function usePublicWhatsAppTemplate() {
  return useQuery({
    queryKey: PUBLIC_WHATSAPP_TEMPLATE_KEY,
    queryFn: () => storeService.getWhatsAppTemplate(),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
}
