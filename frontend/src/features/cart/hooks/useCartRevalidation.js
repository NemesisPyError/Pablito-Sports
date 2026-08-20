import { useCallback, useRef, useState } from 'react';

import { cartService } from '../services/cartService.js';
import { useCartStore } from '../stores/cartStore.js';
import { resolveRevalidation } from '../utils/discrepancies.js';

/**
 * Revalidación del carrito (RN-56, DN-10).
 *
 * Ocurre en dos momentos: al abrir el carrito y antes de generar el mensaje de
 * WhatsApp.
 */

export const REVALIDATION_STATE = {
  IDLE: 'idle',
  LOADING: 'loading',
  VERIFIED: 'verified',
  // AD-30 y 02_ARQUITECTURA.md §13.6: "no se pudo verificar" es un estado
  // distinto de "verificado sin cambios", y la interfaz debe distinguirlos.
  UNVERIFIED: 'unverified',
};

const MAX_VERSION_RETRIES = 3;

export function useCartRevalidation() {
  const [state, setState] = useState(REVALIDATION_STATE.IDLE);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const revalidate = useCallback(async () => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setState(REVALIDATION_STATE.LOADING);
    setError(null);

    try {
      for (let attempt = 0; attempt < MAX_VERSION_RETRIES; attempt += 1) {
        const { items, content_version: sentVersion } = useCartStore.getState();

        if (!items.length) {
          const empty = { items: [], removable: [], hasBlockingChanges: false };
          setResult(empty);
          setState(REVALIDATION_STATE.VERIFIED);
          return empty;
        }

        const response = await cartService.revalidate({
          contentVersion: sentVersion,
          items,
        });

        // AD-22: si la versión cambió mientras la respuesta viajaba, se descarta
        // y se vuelve a pedir.
        const currentVersion = useCartStore.getState().content_version;
        if (response.contentVersion !== currentVersion) continue;

        const resolved = resolveRevalidation(items, response.items);
        setResult(resolved);
        setState(REVALIDATION_STATE.VERIFIED);
        return resolved;
      }

      // El carrito se movió más rápido de lo que se pudo verificar.
      setState(REVALIDATION_STATE.UNVERIFIED);
      return null;
    } catch (caught) {
      // RN-81, AD-30: un fallo de red nunca bloquea la consulta por sí solo.
      setError(caught);
      setState(REVALIDATION_STATE.UNVERIFIED);
      return null;
    } finally {
      inFlight.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setState(REVALIDATION_STATE.IDLE);
    setResult(null);
    setError(null);
  }, []);

  return { state, result, error, revalidate, reset };
}
