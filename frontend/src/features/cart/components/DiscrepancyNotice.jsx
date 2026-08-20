import { formatGuaranies } from '../../../shared/formatters/currency.js';
import { AVAILABILITY_LABELS } from '../../../shared/utils/stock.js';
import { STATUS } from '../utils/discrepancies.js';

/**
 * Aviso de diferencias detectadas en la revalidación.
 *
 * AD-28: nada cambia sin que el cliente lo vea. La interfaz debe distinguir con
 * claridad qué cambió y en qué ítem.
 */

function describe(change, itemName) {
  switch (change.status) {
    case STATUS.PRICE_CHANGED:
      return `${itemName}: el precio cambió de ${formatGuaranies(change.from)} a ${formatGuaranies(change.to)}.`;
    case STATUS.SALE_ENDED:
      return `${itemName}: la oferta venció. El precio pasó a ${formatGuaranies(change.to)}.`;
    case STATUS.AVAILABILITY_CHANGED:
      return `${itemName}: la disponibilidad cambió de ${AVAILABILITY_LABELS[change.from] ?? change.from} a ${AVAILABILITY_LABELS[change.to] ?? change.to}.`;
    case STATUS.PRODUCT_HIDDEN:
      return `${itemName}: la tienda retiró este producto del catálogo. Se quitó del carrito.`;
    case STATUS.PRODUCT_DELETED:
      return `${itemName}: este producto ya no está disponible. Se quitó del carrito.`;
    case STATUS.VARIANT_REMOVED:
      return `${itemName}: ese talle ya no existe. Elegí otro.`;
    default:
      return `${itemName}: hubo un cambio.`;
  }
}

export function DiscrepancyNotice({ items, onConfirm }) {
  const withChanges = items.filter((item) => item.changes.length > 0);
  if (!withChanges.length) return null;

  return (
    <section className="alert alert-warning" role="status" aria-live="polite">
      <h2 className="h6 alert-heading">Hubo cambios en tu carrito</h2>
      <ul className="mb-3 ps-3">
        {withChanges.map((item) =>
          item.changes.map((change) => (
            <li key={`${item.variant_id}-${change.status}`}>{describe(change, item.name)}</li>
          )),
        )}
      </ul>
      {/* RN-78: sin esta confirmación no se compone el mensaje. */}
      <button type="button" className="btn btn-warning" onClick={onConfirm}>
        Entendido, actualizar mi carrito
      </button>
    </section>
  );
}
