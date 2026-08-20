/**
 * Matriz de resolución de discrepancias (AD-25), gobernada por AD-28.
 *
 * El servidor no recibe precios (AD-36), así que devuelve el estado autoritativo
 * y es el cliente quien compara contra su snapshot local (05_API.md §8.5,
 * 06_FRONTEND.md §11.5). Aquí se derivan los estados de comparación.
 */

export const STATUS = {
  OK: 'ok',
  PRODUCT_HIDDEN: 'product_hidden',
  PRODUCT_DELETED: 'product_deleted',
  VARIANT_REMOVED: 'variant_removed',
  AVAILABILITY_CHANGED: 'availability_changed',
  PRICE_CHANGED: 'price_changed',
  SALE_ENDED: 'sale_ended',
};

/** AD-25: qué hace el carrito ante cada estado. */
export const RESOLUTION = {
  [STATUS.OK]: 'keep',
  [STATUS.PRODUCT_HIDDEN]: 'remove',
  [STATUS.PRODUCT_DELETED]: 'remove',
  [STATUS.VARIANT_REMOVED]: 'reselect',
  [STATUS.AVAILABILITY_CHANGED]: 'keep',
  [STATUS.PRICE_CHANGED]: 'keep',
  [STATUS.SALE_ENDED]: 'keep',
};

/** Estados que obligan a confirmar antes de generar el mensaje (RN-77, RN-78). */
const REQUIRES_CONFIRMATION = new Set([
  STATUS.PRODUCT_HIDDEN,
  STATUS.PRODUCT_DELETED,
  STATUS.VARIANT_REMOVED,
  STATUS.AVAILABILITY_CHANGED,
  STATUS.PRICE_CHANGED,
  STATUS.SALE_ENDED,
]);

export function effectivePrice(source) {
  if (!source) return null;
  return source.sale_price ?? source.list_price ?? null;
}

/**
 * Compara un ítem local con su estado autoritativo.
 *
 * Devuelve la lista de cambios detectados. Un ítem puede acumular varios: el
 * precio y la disponibilidad pueden moverse a la vez.
 */
export function diffItem(localItem, serverItem) {
  if (!serverItem) return [];

  if (serverItem.status !== STATUS.OK) {
    return [{ status: serverItem.status }];
  }

  const changes = [];
  const before = localItem.snapshot ?? {};

  const previousPrice = effectivePrice(before);
  const currentPrice = effectivePrice(serverItem);

  // AD-25: la oferta venció → recalcular precio e informar.
  if (before.sale_price != null && serverItem.sale_price == null) {
    changes.push({ status: STATUS.SALE_ENDED, from: previousPrice, to: currentPrice });
  } else if (previousPrice != null && currentPrice != null && previousPrice !== currentPrice) {
    changes.push({ status: STATUS.PRICE_CHANGED, from: previousPrice, to: currentPrice });
  }

  if (before.availability && before.availability !== serverItem.availability) {
    changes.push({
      status: STATUS.AVAILABILITY_CHANGED,
      from: before.availability,
      to: serverItem.availability,
    });
  }

  // AD-28, excepción: nombre e imagen se actualizan sin aviso.
  return changes;
}

/**
 * Resuelve la revalidación completa.
 *
 * `hasBlockingChanges` implementa RN-78: mientras sea `true` no se compone el
 * mensaje de WhatsApp.
 */
export function resolveRevalidation(localItems, serverItems) {
  const byId = new Map(serverItems.map((item) => [item.variant_id, item]));

  const perItem = localItems.map((localItem) => {
    const serverItem = byId.get(localItem.variant_id);
    const changes = diffItem(localItem, serverItem);
    return {
      variant_id: localItem.variant_id,
      name: localItem.snapshot?.name ?? serverItem?.product?.name ?? '',
      quantity: localItem.quantity,
      // El snapshot viaja con el resultado: es el único origen de marca y
      // talle, que el servidor no devuelve en la revalidación (05_API.md §8.3).
      snapshot: localItem.snapshot ?? null,
      server: serverItem ?? null,
      changes,
      resolution: changes.length ? RESOLUTION[changes[0].status] : 'keep',
    };
  });

  const removable = perItem
    .filter((item) => item.resolution === 'remove' || item.resolution === 'reselect')
    .map((item) => item.variant_id);

  const hasBlockingChanges = perItem.some((item) =>
    item.changes.some((change) => REQUIRES_CONFIRMATION.has(change.status)),
  );

  return { items: perItem, removable, hasBlockingChanges };
}

/** RN-55: subtotal por ítem y total estimado, con el precio recién revalidado. */
export function estimatedTotal(items) {
  return items.reduce((total, item) => {
    const price = effectivePrice(item.server ?? item.snapshot);
    return price == null ? total : total + price * item.quantity;
  }, 0);
}
