/**
 * Plantillas por defecto (01_ANALISIS_NEGOCIO.md §12.3, RN-61).
 *
 * Se transcriben literalmente del documento aprobado.
 *
 * ⚠️ Se usan como origen porque `StoreSettingsPublicDTO` (05_API.md §10.2) no
 * expone `message_template` ni `item_template`: son campos del DTO de panel. Sin
 * ellos en el contrato público, una plantilla editada por el administrador
 * (RN-59) no puede llegar al catálogo. Registrado como duda para el equipo.
 */

export const DEFAULT_MESSAGE_TEMPLATE = `Hola {{tienda}}! 👋
Quiero consultar por estos productos:

{{items}}
--------------------------------
Total estimado: {{total}}
(Precios sujetos a confirmación)

Consulta N.º: {{codigo_consulta}}`;

export const DEFAULT_ITEM_TEMPLATE = `{{numero}}) {{producto}}
   Marca: {{marca}} | Talle: {{talle}}
   Cantidad: {{cantidad}} x {{precio_unitario}} = {{subtotal}}
   Estado: {{disponibilidad}}`;

export function withDefaults(templates) {
  return {
    message_template: templates?.message_template || DEFAULT_MESSAGE_TEMPLATE,
    item_template: templates?.item_template || DEFAULT_ITEM_TEMPLATE,
  };
}
