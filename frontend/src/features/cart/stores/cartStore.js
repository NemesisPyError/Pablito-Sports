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
  // RN-54b: se pidieron más unidades de las que hay de ese talle.
  INSUFFICIENT_STOCK: 'insufficient_stock',
};

/**
 * Tope de unidades que el carrito acepta para una variante.
 *
 * Espeja `max_orderable_units` del backend (`core/utils/stock.py`), y la
 * duplicación es deliberada: acá se limita para no frustrar al cliente —el `+`
 * se apaga antes de que pase nada— y allá se limita para no vender lo que no
 * hay. El servidor no confía en este número, lo vuelve a calcular al revalidar.
 *
 * `stock` en `null` significa «hay de sobra y el número exacto no se publica»
 * (divulgación acotada del backend): ahí manda `MAX_QUANTITY`, y el servidor
 * sigue siendo quien corta si el cliente se pasa.
 *
 * El piso de 1 es `RN-40`: un talle agotado se puede agregar igual, porque el
 * carrito es de consulta y termina en WhatsApp. Una unidad, no más.
 */
export function maxOrderable(stock) {
  if (stock == null) return MAX_QUANTITY;
  return Math.min(Math.max(stock, 1), MAX_QUANTITY);
}

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

      /**
       * RN-53: la unidad del carrito es la variante.
       *
       * `stock` es la cantidad real del talle (`available_quantity` del DTO);
       * `null` cuando el backend no publica el número. Agregar algo que ya
       * está en el carrito **suma** sobre lo que había, así que el tope se
       * mide contra el total resultante y no contra lo que se agrega ahora:
       * sin eso, agregar de a uno permitía superar el stock a fuerza de
       * repetir la acción.
       */
      addItem(variantId, quantity, snapshot, stock = null) {
        if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
          return { ok: false, error: CART_ERRORS.INVALID_QUANTITY };
        }

        const state = get();
        const existing = state.items.find((item) => item.variant_id === variantId);

        if (!existing && state.items.length >= MAX_DISTINCT_ITEMS) {
          // RN-75: alcanzado el límite se informa al cliente con un mensaje claro.
          return { ok: false, error: CART_ERRORS.TOO_MANY_ITEMS, limit: MAX_DISTINCT_ITEMS };
        }

        const tope = maxOrderable(stock);
        const total = (existing?.quantity ?? 0) + quantity;
        if (total > tope) {
          return { ok: false, error: CART_ERRORS.INSUFFICIENT_STOCK, available: stock, limit: tope };
        }

        const items = existing
          ? state.items.map((item) =>
              item.variant_id === variantId ? { ...item, quantity: total, snapshot } : item,
            )
          : [...state.items, { variant_id: variantId, quantity, snapshot }];

        set(mutate(state, items));
        return { ok: true };
      },

      updateQuantity(variantId, quantity, stock = null) {
        if (!Number.isInteger(quantity) || quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
          return { ok: false, error: CART_ERRORS.INVALID_QUANTITY };
        }

        const tope = maxOrderable(stock);
        if (quantity > tope) {
          // Cubre tanto el botón `+` como la cantidad escrita a mano: los dos
          // terminan acá, así que no hay un camino que se salte el límite.
          return { ok: false, error: CART_ERRORS.INSUFFICIENT_STOCK, available: stock, limit: tope };
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
            // `insufficient_stock` no saca la línea del carrito: el talle sigue
            // existiendo y a la venta, solo hay menos unidades. Se recorta más
            // abajo. Lo que sí desaparece es lo que ya no se puede comprar
            // (variante eliminada, producto oculto o borrado).
            return !result || result.status === 'ok' || result.status === 'insufficient_stock';
          })
          .map((item) => {
            const result = byId.get(item.variant_id);
            if (!result) return item;

            // `insufficient_stock`: el servidor manda. Pudo venderse stock
            // entre que se armó el carrito y se revisó, así que la línea se
            // recorta a lo que realmente hay —nunca por debajo de una unidad,
            // RN-40— en lugar de desaparecer: el cliente sigue pudiendo
            // consultar por ese talle.
            if (result.status === 'insufficient_stock') {
              return {
                ...item,
                quantity: Math.max(result.available_quantity ?? 1, 1),
                snapshot: {
                  ...item.snapshot,
                  name: result.product.name,
                  slug: result.product.slug,
                  thumbnail_url: result.product.thumbnail_url,
                  list_price: result.list_price,
                  sale_price: result.sale_price,
                  availability: result.availability,
                  available_quantity: result.available_quantity ?? null,
                },
              };
            }

            if (result.status !== 'ok') return item;
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
                available_quantity: result.available_quantity ?? null,
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
