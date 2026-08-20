/**
 * Módulo único de WhatsApp (R-04, 02_ARQUITECTURA.md §13.11).
 *
 * Composición del mensaje, sustitución de variables, control de longitud y
 * construcción del enlace viven aquí. Ningún componente arma un `wa.me` por su
 * cuenta.
 */

import { formatGuaranies } from '../../../shared/formatters/currency.js';
import { AVAILABILITY_LABELS } from '../../../shared/utils/stock.js';
import { effectivePrice } from '../utils/discrepancies.js';
import { withDefaults } from './defaultTemplates.js';
import { dropEmptyLabels, render } from './template.js';

/**
 * Presupuesto de longitud (02_ARQUITECTURA.md §13.10, resolución de ADP-07).
 *
 * El techo vinculante es el del CUERPO del mensaje, no el del enlace: el
 * transporte admite ≥ 40 000 caracteres. 4 096 es la cifra oficial de Meta;
 * 4 000 es el techo de trabajo, con el margen derivado de una eventual medición
 * en bytes UTF-8.
 */
export const MESSAGE_HARD_LIMIT = 4096;
export const MESSAGE_WORKING_LIMIT = 4000;

/** RN-64: código de consulta corto, generado en el cliente. No se almacena (RN-63). */
export function generateInquiryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PS-${code}`;
}

function itemValues(item, index) {
  const source = item.server ?? item.snapshot ?? {};
  const snapshot = item.snapshot ?? {};
  const unitPrice = effectivePrice(source) ?? 0;
  return {
    numero: index + 1,
    // El servidor anida el nombre bajo `product` (05_API.md §8.3); el snapshot lo
    // tiene plano. La marca y el talle sólo existen en el snapshot.
    producto: item.server?.product?.name ?? snapshot.name ?? '',
    marca: snapshot.brand ?? '',
    talle: snapshot.size ?? '',
    cantidad: item.quantity,
    precio_unitario: formatGuaranies(unitPrice),
    subtotal: formatGuaranies(unitPrice * item.quantity),
    disponibilidad: AVAILABILITY_LABELS[source.availability] ?? '',
  };
}

/**
 * Compone el cuerpo del mensaje con las plantillas de `store_settings`
 * (RN-59 a RN-61).
 */
export function buildMessage({ items, templates, storeName, inquiryCode, now = new Date() }) {
  const unknown = new Set();
  const active = withDefaults(templates);

  const renderedItems = items.map((item, index) => {
    const result = render(active.item_template, itemValues(item, index));
    result.unknown.forEach((name) => unknown.add(name));
    return dropEmptyLabels(result.text);
  });

  const total = items.reduce((sum, item) => {
    const price = effectivePrice(item.server ?? item.snapshot) ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const message = render(active.message_template, {
    items: renderedItems.join('\n'),
    total: formatGuaranies(total),
    cantidad_items: items.length,
    codigo_consulta: inquiryCode,
    tienda: storeName ?? '',
    fecha: now.toLocaleDateString('es-PY'),
  });
  message.unknown.forEach((name) => unknown.add(name));

  return { text: message.text, total, unknownVariables: [...unknown] };
}

/**
 * Valida la longitud real del cuerpo antes de generar el enlace.
 *
 * RN-76: es la única defensa que garantiza el límite. El tope de 26 ítems
 * (RN-75) reduce la frecuencia con que interviene, no la reemplaza (DN-17).
 */
export function checkLength(text) {
  const length = [...String(text)].length;
  return {
    length,
    withinBudget: length <= MESSAGE_WORKING_LIMIT,
    workingLimit: MESSAGE_WORKING_LIMIT,
    hardLimit: MESSAGE_HARD_LIMIT,
  };
}

/** RN-62: enlace `wa.me`. El sistema nunca envía; el cliente confirma en WhatsApp. */
export function buildWhatsAppLink(whatsappNumber, text) {
  const number = String(whatsappNumber ?? '').replace(/[^\d]/g, '');
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/**
 * Punto de entrada del dominio: "generar la consulta" (INT-02).
 *
 * Devuelve el enlace sólo si el cuerpo cabe en el presupuesto. Si no, advierte y
 * no genera nada (RN-76, 06_FRONTEND.md §11.8).
 */
export function buildInquiry({ items, templates, storeName, whatsappNumber, now }) {
  const inquiryCode = generateInquiryCode();
  const composed = buildMessage({ items, templates, storeName, inquiryCode, now });
  const budget = checkLength(composed.text);

  if (!budget.withinBudget) {
    return { ok: false, reason: 'message_too_long', budget, ...composed, inquiryCode };
  }

  return {
    ok: true,
    url: buildWhatsAppLink(whatsappNumber, composed.text),
    budget,
    inquiryCode,
    ...composed,
  };
}

export { dropEmptyLabels, missingRequiredVariables, render } from './template.js';
