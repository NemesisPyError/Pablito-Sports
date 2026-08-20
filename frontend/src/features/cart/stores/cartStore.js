import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Store del carrito (AD-06, RN-52).
 *
 * Vive en LocalStorage. La estructura guardada es la de 06_FRONTEND.md §11.1.
 * Ningún componente importa este store directamente: acceden por los hooks del
 * feature (DEP-11).
 */

// ES-04: si la versión de formato no coincide, el carrito se descarta sin migrar.
export const CART_FORMAT_VERSION = 1;
export const STORAGE_KEY = 'pablito.cart';

// RN-75, DN-17
export const MAX_DISTINCT_ITEMS = 26;
// RN-54
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
// RN-57
export const EXPIRY_DAYS = 30;

export const CART_ERRORS = {
  TOO_MANY_ITEMS: 'too_many_items',
  INVALID_QUANTITY: 'invalid_quantity',
};

function nowIso() {
  return new Date().toISOString();
}

/** RN-57: el carrito expira a los 30 días desde su última modificación. */
export function isExpired(lastModifiedAt, now = Date.now()) {
  if (!lastModifiedAt) return false;
  const elapsed = now - new Date(lastModifiedAt).getTime();
  return elapsed > EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

const emptyState = {
  format_version: CART_FORMAT_VERSION,
  content_version: 0,
  last_modified_at: null,
  items: [],
};

/** AD-22: toda mutación incrementa la versión de contenido, sin excepción. */
function mutate(state, items) {
  return {
    ...state,
    items,
    content_version: state.content_version + 1,
    last_modified_at: nowIso(),
  };
}

export const useCartStore = create(
  persist(
    (set, get) => ({
      ...emptyState,

      /** RN-53: la unidad del carrito es la variante. */
      addItem(variantId, quantity, snapshot) {
        if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
          return { ok: false, error: CART_ERRORS.INVALID_QUANTITY };
        }

        const state = get();
        const existing = state.items.find((item) => item.variant_id === variantId);

        if (!existing && state.items.length >= MAX_DISTINCT_ITEMS) {
          // RN-75: alcanzado el límite se informa al cliente con un mensaje claro.
          return { ok: false, error: CART_ERRORS.TOO_MANY_ITEMS, limit: MAX_DISTINCT_ITEMS };
        }

        const items = existing
          ? state.items.map((item) =>
              item.variant_id === variantId
                ? { ...item, quantity: Math.min(item.quantity + quantity, MAX_QUANTITY), snapshot }
                : item,
            )
          : [...state.items, { variant_id: variantId, quantity, snapshot }];

        set(mutate(state, items));
        return { ok: true };
      },

      updateQuantity(variantId, quantity) {
        if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
          return { ok: false, error: CART_ERRORS.INVALID_QUANTITY };
        }
        const state = get();
        set(
          mutate(
            state,
            state.items.map((item) =>
              item.variant_id === variantId ? { ...item, quantity } : item,
            ),
          ),
        );
        return { ok: true };
      },

      removeItem(variantId) {
        const state = get();
        set(
          mutate(
            state,
            state.items.filter((item) => item.variant_id !== variantId),
          ),
        );
      },

      removeItems(variantIds) {
        const ids = new Set(variantIds);
        const state = get();
        if (!ids.size) return;
        set(
          mutate(
            state,
            state.items.filter((item) => !ids.has(item.variant_id)),
          ),
        );
      },

      clear() {
        set({ ...emptyState, content_version: get().content_version + 1 });
      },

      /**
       * Aplica el estado autoritativo recién revalidado.
       *
       * AD-28: no se llama en silencio. La UI muestra primero las diferencias y
       * el cliente confirma (RN-78); recién entonces se invoca esto.
       */
      applyRevalidation(states) {
        const byId = new Map(states.map((item) => [item.variant_id, item]));
        const state = get();
        const items = state.items
          .filter((item) => {
            const result = byId.get(item.variant_id);
            return !result || result.status === 'ok';
          })
          .map((item) => {
            const result = byId.get(item.variant_id);
            if (!result || result.status !== 'ok') return item;
            return {
              ...item,
              snapshot: {
                ...item.snapshot,
                name: result.product.name,
                slug: result.product.slug,
                thumbnail_url: result.product.thumbnail_url,
                list_price: result.list_price,
                sale_price: result.sale_price,
                availability: result.availability,
              },
            };
          });
        set(mutate(state, items));
      },

      /** ES-04 y RN-57: descarta el carrito si el formato o la antigüedad no sirven. */
      discardIfStale() {
        const state = get();
        if (state.format_version !== CART_FORMAT_VERSION) {
          set({ ...emptyState });
          return 'format';
        }
        if (isExpired(state.last_modified_at)) {
          set({ ...emptyState });
          return 'expired';
        }
        return null;
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        format_version: state.format_version,
        content_version: state.content_version,
        last_modified_at: state.last_modified_at,
        items: state.items,
      }),
    },
  ),
);
