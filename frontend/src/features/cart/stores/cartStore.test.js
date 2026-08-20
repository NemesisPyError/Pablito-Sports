import { beforeEach, describe, expect, it } from 'vitest';

import {
  CART_ERRORS,
  CART_FORMAT_VERSION,
  EXPIRY_DAYS,
  MAX_DISTINCT_ITEMS,
  isExpired,
  useCartStore,
} from './cartStore.js';

const snapshot = {
  slug: 'p',
  name: 'Producto',
  brand: 'Nike',
  size: '42',
  list_price: 650000,
  sale_price: 585000,
  availability: 'available',
};

function reset() {
  useCartStore.setState({
    format_version: CART_FORMAT_VERSION,
    content_version: 0,
    last_modified_at: null,
    items: [],
  });
}

describe('carrito', () => {
  beforeEach(reset);

  it('la unidad es la variante (RN-53)', () => {
    useCartStore.getState().addItem(1, 1, snapshot);
    useCartStore.getState().addItem(2, 1, snapshot);

    expect(useCartStore.getState().items).toHaveLength(2);
  });

  it('acumula cantidad al reagregar la misma variante', () => {
    useCartStore.getState().addItem(1, 2, snapshot);
    useCartStore.getState().addItem(1, 3, snapshot);

    expect(useCartStore.getState().items[0].quantity).toBe(5);
  });

  it.each([0, 100, 1.5])('rechaza la cantidad inválida %s (RN-54)', (quantity) => {
    const result = useCartStore.getState().addItem(1, quantity, snapshot);

    expect(result).toEqual({ ok: false, error: CART_ERRORS.INVALID_QUANTITY });
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('admite como máximo 26 productos distintos (RN-75, DN-17)', () => {
    for (let id = 1; id <= MAX_DISTINCT_ITEMS; id += 1) {
      expect(useCartStore.getState().addItem(id, 1, snapshot).ok).toBe(true);
    }

    const overflow = useCartStore.getState().addItem(99, 1, snapshot);

    expect(overflow).toEqual({
      ok: false,
      error: CART_ERRORS.TOO_MANY_ITEMS,
      limit: MAX_DISTINCT_ITEMS,
    });
    expect(useCartStore.getState().items).toHaveLength(MAX_DISTINCT_ITEMS);
  });

  it('permite subir la cantidad de un ítem existente estando en el límite', () => {
    for (let id = 1; id <= MAX_DISTINCT_ITEMS; id += 1) {
      useCartStore.getState().addItem(id, 1, snapshot);
    }

    expect(useCartStore.getState().addItem(1, 1, snapshot).ok).toBe(true);
  });
});

describe('versión de contenido (AD-22)', () => {
  beforeEach(reset);

  it('incrementa en cada mutación, sin excepción', () => {
    const versions = [];
    versions.push(useCartStore.getState().content_version);

    useCartStore.getState().addItem(1, 1, snapshot);
    versions.push(useCartStore.getState().content_version);

    useCartStore.getState().updateQuantity(1, 3);
    versions.push(useCartStore.getState().content_version);

    useCartStore.getState().addItem(2, 1, snapshot);
    versions.push(useCartStore.getState().content_version);

    useCartStore.getState().removeItem(2);
    versions.push(useCartStore.getState().content_version);

    useCartStore.getState().clear();
    versions.push(useCartStore.getState().content_version);

    expect(versions).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('no incrementa cuando la mutación fue rechazada', () => {
    useCartStore.getState().addItem(1, 0, snapshot);

    expect(useCartStore.getState().content_version).toBe(0);
  });
});

describe('expiración y formato', () => {
  beforeEach(reset);

  it('el carrito expira a los 30 días (RN-57)', () => {
    const now = Date.now();
    const older = new Date(now - (EXPIRY_DAYS + 1) * 86400000).toISOString();
    const recent = new Date(now - 1000).toISOString();

    expect(isExpired(older, now)).toBe(true);
    expect(isExpired(recent, now)).toBe(false);
  });

  it('descarta el carrito expirado', () => {
    useCartStore.getState().addItem(1, 1, snapshot);
    useCartStore.setState({
      last_modified_at: new Date(Date.now() - (EXPIRY_DAYS + 1) * 86400000).toISOString(),
    });

    expect(useCartStore.getState().discardIfStale()).toBe('expired');
    expect(useCartStore.getState().items).toEqual([]);
  });

  it('descarta el carrito con formato desconocido (ES-04)', () => {
    useCartStore.getState().addItem(1, 1, snapshot);
    useCartStore.setState({ format_version: 99 });

    expect(useCartStore.getState().discardIfStale()).toBe('format');
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe('aplicación de la revalidación', () => {
  beforeEach(reset);

  it('quita los ítems que dejaron de estar disponibles y actualiza el resto', () => {
    useCartStore.getState().addItem(1, 1, snapshot);
    useCartStore.getState().addItem(2, 1, snapshot);

    useCartStore.getState().applyRevalidation([
      {
        variant_id: 1,
        status: 'ok',
        product: { slug: 'p', name: 'Producto', thumbnail_url: '/nuevo.webp' },
        list_price: 650000,
        sale_price: 500000,
        availability: 'low_stock',
      },
      { variant_id: 2, status: 'product_hidden', product: null },
    ]);

    const items = useCartStore.getState().items;

    expect(items).toHaveLength(1);
    expect(items[0].snapshot.sale_price).toBe(500000);
    expect(items[0].snapshot.availability).toBe('low_stock');
  });
});
