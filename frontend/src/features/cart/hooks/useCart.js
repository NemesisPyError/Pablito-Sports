import { useCartStore } from '../stores/cartStore.js';
import { effectivePrice } from '../utils/discrepancies.js';

/**
 * Superficie del carrito para los componentes.
 *
 * DEP-11: los componentes no importan Zustand; hablan con este hook.
 */
export function useCart() {
  const items = useCartStore((state) => state.items);
  const contentVersion = useCartStore((state) => state.content_version);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const removeItems = useCartStore((state) => state.removeItems);
  const clear = useCartStore((state) => state.clear);
  const applyRevalidation = useCartStore((state) => state.applyRevalidation);
  const discardIfStale = useCartStore((state) => state.discardIfStale);

  // RN-55: subtotal por ítem y total estimado.
  const total = items.reduce((sum, item) => {
    const price = effectivePrice(item.snapshot) ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return {
    items,
    contentVersion,
    total,
    count: items.length,
    addItem,
    updateQuantity,
    removeItem,
    removeItems,
    clear,
    applyRevalidation,
    discardIfStale,
  };
}
