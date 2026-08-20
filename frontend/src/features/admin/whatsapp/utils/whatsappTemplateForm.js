/**
 * Conversión, validación y vista previa de la plantilla (§9.13, §14.8).
 *
 * `missingVariables`/`REQUIRED_MESSAGE_VARIABLES` se reutilizan de
 * `settings/utils/settingsForm.js`: es la misma regla (`RN-60`) que ya aplica
 * la pantalla de Configuración cuando reenvía estos campos sin editarlos, y
 * duplicarla aquí las dejaría libres de divergir.
 */

import { dropEmptyLabels, render } from '../../../cart/whatsapp/template.js';
import { missingVariables, REQUIRED_MESSAGE_VARIABLES } from '../../settings/utils/settingsForm.js';

export { REQUIRED_MESSAGE_VARIABLES };

/** Variables que puede usar `message_template` (01_ANALISIS_NEGOCIO.md §12.2). */
export const MESSAGE_VARIABLES = [
  { name: 'tienda', required: false },
  { name: 'items', required: true },
  { name: 'total', required: true },
  { name: 'codigo_consulta', required: false },
];

/** Variables que puede usar `item_template`. Ninguna es obligatoria (§12.2). */
export const ITEM_VARIABLES = [
  'numero',
  'producto',
  'marca',
  'talle',
  'cantidad',
  'precio_unitario',
  'subtotal',
  'disponibilidad',
].map((name) => ({ name, required: false }));

/** Estado inicial del formulario a partir de un `WhatsAppTemplateDTO`. */
export function toFormValues(template) {
  return {
    message_template: template?.message_template ?? '',
    item_template: template?.item_template ?? '',
  };
}

/** Cuerpo del `PUT`/respuesta del `POST reset` (§9.13): exactamente estos dos campos. */
export function toPayload(values) {
  return {
    message_template: values.message_template,
    item_template: values.item_template,
  };
}

export function isDirty(values, initialValues) {
  return JSON.stringify(toPayload(values)) !== JSON.stringify(toPayload(initialValues));
}

/** `RF-41`/`RN-60`: valida antes de guardar lo mismo que el backend exige. */
export function validate(values) {
  const errores = {};

  if (!values.message_template?.trim()) {
    errores.message_template = 'La plantilla del mensaje es obligatoria.';
  } else {
    const faltantes = missingVariables(values.message_template, REQUIRED_MESSAGE_VARIABLES);
    if (faltantes.length > 0) {
      errores.message_template = `Faltan variables obligatorias: ${faltantes
        .map((nombre) => `{{${nombre}}}`)
        .join(', ')}.`;
    }
  }

  if (!values.item_template?.trim()) {
    errores.item_template = 'La plantilla de ítem es obligatoria.';
  }

  return errores;
}

/**
 * Dos ítems de ejemplo para la vista previa (`RF-41`).
 *
 * Uno sin talle: ejercita la omisión de etiqueta y valor juntos
 * (`dropEmptyLabels`, §13.9) igual que un producto real sin esa variante.
 */
const ITEMS_DE_EJEMPLO = [
  {
    numero: 1,
    producto: 'Botín Adidas Predator',
    marca: 'Adidas',
    talle: '42',
    cantidad: 1,
    precio_unitario: 'Gs. 720.000',
    subtotal: 'Gs. 720.000',
    disponibilidad: 'Stock bajo',
  },
  {
    numero: 2,
    producto: 'Remera Nike Dri-FIT',
    marca: 'Nike',
    talle: '',
    cantidad: 2,
    precio_unitario: 'Gs. 180.000',
    subtotal: 'Gs. 360.000',
    disponibilidad: 'Disponible',
  },
];

/**
 * Compone la vista previa con datos de ejemplo (`RF-41`).
 *
 * Reutiliza el mismo motor de sustitución que arma el mensaje real
 * (`features/cart/whatsapp/template.js`, PR-06): lo que se ve acá es
 * exactamente cómo se compondría con esta plantilla, no una aproximación.
 */
export function buildPreview({ message_template, item_template }, storeName = 'Pablito Sports') {
  const renderedItems = ITEMS_DE_EJEMPLO.map(
    (item) => dropEmptyLabels(render(item_template, item).text),
  );

  const mensaje = render(message_template, {
    items: renderedItems.join('\n'),
    total: 'Gs. 1.080.000',
    codigo_consulta: 'PS-7K2QX',
    tienda: storeName,
  });

  return mensaje.text;
}
