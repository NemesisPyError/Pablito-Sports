import { useEffect } from 'react';

import { STORAGE_KEY, useCartStore } from '../stores/cartStore.js';

/**
 * Sincronización entre pestañas (06_FRONTEND.md §11.3).
 *
 * LocalStorage se comparte entre pestañas del mismo origen. Sin esto, dos
 * pestañas con el carrito abierto divergen y `AD-22` descartaría respuestas de
 * revalidación sin explicación visible.
 */
export function useCartSync() {
  useEffect(() => {
    function onStorage(event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue);
        useCartStore.setState(parsed.state ?? {});
      } catch {
        // Un valor ilegible en otra pestaña no debe tumbar esta.
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
}
