import { formatGuaranies } from '../../../shared/formatters/currency.js';
import { AVAILABILITY_LABELS } from '../../../shared/utils/stock.js';
import { MAX_QUANTITY, MIN_QUANTITY } from '../stores/cartStore.js';
import { effectivePrice } from '../utils/discrepancies.js';
import styles from './CartItemRow.module.css';

/** Un ítem del carrito. RN-53: la unidad es la variante. */
export function CartItemRow({ item, changed, onQuantityChange, onRemove }) {
  const snapshot = item.snapshot ?? {};
  const price = effectivePrice(snapshot);
  const hasDiscount = snapshot.sale_price != null && snapshot.sale_price < snapshot.list_price;

  return (
    <li className={`list-group-item ${changed ? 'list-group-item-warning' : ''}`}>
      <div className="d-flex gap-3 align-items-start">
        <div className="flex-grow-1">
          <p className="mb-1 fw-semibold">{snapshot.name}</p>
          <p className="mb-1 small text-muted">
            {[snapshot.brand, snapshot.size].filter(Boolean).join(' · ')}
          </p>
          <p className="mb-0 small">
            {AVAILABILITY_LABELS[snapshot.availability] ?? snapshot.availability}
          </p>
        </div>

        <div className="text-end">
          {hasDiscount && (
            <span className="text-decoration-line-through text-muted me-2 small">
              {formatGuaranies(snapshot.list_price)}
            </span>
          )}
          <span className="fw-semibold">{formatGuaranies(price)}</span>

          <div className="mt-2 d-flex gap-2 align-items-center justify-content-end">
            <label className="visually-hidden" htmlFor={`qty-${item.variant_id}`}>
              Cantidad
            </label>
            <input
              id={`qty-${item.variant_id}`}
              className={`form-control form-control-sm ${styles.quantityInput}`}
              type="number"
              min={MIN_QUANTITY}
              max={MAX_QUANTITY}
              value={item.quantity}
              onChange={(event) => onQuantityChange(item.variant_id, Number(event.target.value))}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onRemove(item.variant_id)}
            >
              Quitar
            </button>
          </div>

          {/* RN-55: subtotal por ítem. */}
          <p className="mb-0 mt-2 small text-muted">
            Subtotal: {formatGuaranies((price ?? 0) * item.quantity)}
          </p>
        </div>
      </div>
    </li>
  );
}
