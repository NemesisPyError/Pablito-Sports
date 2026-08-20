/**
 * Deriva el estado de disponibilidad a partir de una cantidad (`RN-38b`).
 *
 * Réplica exacta de `backend/app/core/utils/stock.py::derive_availability`.
 * El catálogo público no la necesita — el backend ya entrega `availability`
 * derivado en el DTO —, pero el panel sí, para previsualizar el estado
 * mientras el administrador escribe una cantidad, antes de guardar.
 */

export const AVAILABLE = 'available';
export const LOW_STOCK = 'low_stock';
export const OUT_OF_STOCK = 'out_of_stock';

/** `> 5` disponible, `1` a `5` stock bajo, `0` (o sin variantes) no disponible. */
export function getStockStatus(quantity) {
  const cantidad = Number(quantity) || 0;
  if (cantidad > 5) return AVAILABLE;
  if (cantidad >= 1) return LOW_STOCK;
  return OUT_OF_STOCK;
}

/**
 * Fuente única de las 3 etiquetas de disponibilidad (v1.4.0, `RN-38b`).
 * La reutiliza cualquier lugar que necesite el texto sin el badge visual
 * (`AvailabilityBadge`, WhatsApp, carrito, tabla del panel).
 */
export const AVAILABILITY_LABELS = {
  [AVAILABLE]: 'Disponible',
  [LOW_STOCK]: 'Stock bajo',
  [OUT_OF_STOCK]: 'No disponible',
};
