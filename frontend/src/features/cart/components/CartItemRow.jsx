import { useState } from 'react';

import { Image } from '../../../shared/components/Image.jsx';
import { formatGuaranies } from '../../../shared/formatters/currency.js';
import { AVAILABILITY_LABELS } from '../../../shared/utils/stock.js';
import { maxOrderable, MIN_QUANTITY } from '../stores/cartStore.js';
import { effectivePrice } from '../utils/discrepancies.js';
import { mensajeDeRechazo } from '../utils/stockMessages.js';
import styles from './CartItemRow.module.css';

/** Un ítem del carrito. RN-53: la unidad es la variante. */
export function CartItemRow({ item, changed, onQuantityChange, onRemove }) {
  const snapshot = item.snapshot ?? {};
  const price = effectivePrice(snapshot);
  const hasDiscount = snapshot.sale_price != null && snapshot.sale_price < snapshot.list_price;

  // RN-54b. El tope viaja en el snapshot y se refresca en cada revalidación;
  // `null` = el backend no publica el número porque hay de sobra.
  const stock = snapshot.available_quantity ?? null;
  const tope = maxOrderable(stock);
  const [aviso, setAviso] = useState(null);

  const cambiarCantidad = (valorCrudo) => {
    // Mientras el campo está vacío no hay nada que validar: avisar ahí sería
    // regañar al cliente por estar tecleando.
    if (valorCrudo === '') return;

    const resultado = onQuantityChange(item.variant_id, Number(valorCrudo), stock);
    setAviso(resultado?.ok === false ? mensajeDeRechazo(resultado, snapshot.size) : null);
  };

  return (
    <li className={`list-group-item ${changed ? 'list-group-item-warning' : ''}`}>
      <div className="d-flex gap-3 align-items-start">
        {/* Miniatura del producto elegido. El snapshot guarda `thumbnail_url`
            al agregar la variante (ProductDetailPage); sin foto, el propio
            componente Image dibuja el recuadro «Sin imagen». */}
        <Image
          src={snapshot.thumbnail_url}
          alt={snapshot.name || ''}
          aspectRatio="1 / 1"
          objectFit="contain"
          className={styles.thumbnail}
        />

        <div className="flex-grow-1">
          <p className="mb-1 fw-semibold">{snapshot.name}</p>
          <p className="mb-1 small text-muted">
            {[snapshot.brand, snapshot.size].filter(Boolean).join(' · ')}
          </p>
          {/* «Stock bajo» es información de inventario, no un mensaje para el
              cliente: acá solo importa si sigue disponible. */}
          {snapshot.availability !== 'low_stock' && (
            <p className="mb-0 small">
              {AVAILABILITY_LABELS[snapshot.availability] ?? snapshot.availability}
            </p>
          )}
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
              // El `max` frena el `+` del control nativo antes de que pase
              // nada; el valor tecleado a mano lo rechaza el store, que es el
              // único camino real hacia el estado.
              max={tope}
              value={item.quantity}
              aria-describedby={aviso ? `qty-aviso-${item.variant_id}` : undefined}
              aria-invalid={aviso ? true : undefined}
              onChange={(event) => cambiarCantidad(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => onRemove(item.variant_id)}
            >
              Quitar
            </button>
          </div>

          {aviso && (
            <p
              id={`qty-aviso-${item.variant_id}`}
              className="mb-0 mt-2 small text-danger"
              role="alert"
            >
              {aviso}
            </p>
          )}

          {/* RN-55: subtotal por ítem. */}
          <p className="mb-0 mt-2 small text-muted">
            Subtotal: {formatGuaranies((price ?? 0) * item.quantity)}
          </p>
        </div>
      </div>
    </li>
  );
}
