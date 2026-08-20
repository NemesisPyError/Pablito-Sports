import { beforeEach, describe, expect, it } from 'vitest';

import { CART_FORMAT_VERSION, STORAGE_KEY, useCartStore } from './cartStore.js';

const snapshot = {
  slug: 'p',
  name: 'Producto',
  brand: 'Nike',
  size: '42',
  list_price: 650000,
  sale_price: 585000,
  availability: 'available',
};

describe('persistencia en LocalStorage (AD-06, RN-52)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useCartStore.setState({
      format_version: CART_FORMAT_VERSION,
      content_version: 0,
      last_modified_at: null,
      items: [],
    });
  });

  it('escribe el carrito con la estructura de 06_FRONTEND.md §11.1', () => {
    useCartStore.getState().addItem(842, 2, snapshot);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)).state;

    expect(Object.keys(stored).sort()).toEqual([
      'content_version',
      'format_version',
      'items',
      'last_modified_at',
    ]);
    expect(stored.format_version).toBe(CART_FORMAT_VERSION);
    expect(stored.content_version).toBe(1);
    expect(stored.last_modified_at).toBeTruthy();
    expect(stored.items).toEqual([{ variant_id: 842, quantity: 2, snapshot }]);
  });

  it('el servidor no recibe precios, pero el snapshot local sí los guarda (AD-36)', () => {
    useCartStore.getState().addItem(842, 1, snapshot);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)).state;

    // El snapshot es para renderizar sin red (02_ARQUITECTURA.md §13.2).
    expect(stored.items[0].snapshot.list_price).toBe(650000);
  });

  it('rehidrata el carrito guardado por una sesión anterior', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          format_version: CART_FORMAT_VERSION,
          content_version: 7,
          last_modified_at: new Date().toISOString(),
          items: [{ variant_id: 5, quantity: 3, snapshot }],
        },
        version: 0,
      }),
    );

    useCartStore.persist.rehydrate();

    expect(useCartStore.getState().items).toEqual([{ variant_id: 5, quantity: 3, snapshot }]);
    expect(useCartStore.getState().content_version).toBe(7);
  });

  it('cada mutación persiste la nueva versión de contenido (AD-22)', () => {
    useCartStore.getState().addItem(1, 1, snapshot);
    useCartStore.getState().updateQuantity(1, 4);

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY)).state;

    expect(stored.content_version).toBe(2);
    expect(stored.items[0].quantity).toBe(4);
  });
});
