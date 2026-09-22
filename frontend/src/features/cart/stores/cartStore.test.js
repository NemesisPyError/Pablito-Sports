import { beforeEach, describe, expect, it } from 'vitest';

import {
  CART_ERRORS,
  CART_FORMAT_VERSION,
  EXPIRY_DAYS,
  MAX_DISTINCT_ITEMS,
  isExpired,
  maxOrderable,
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


/*
 * Límite por stock del talle (RN-54b).
 *
 * El tercer argumento de `addItem`/`updateQuantity` es el stock real de la
 * variante (`available_quantity`); `null` significa «hay de sobra y el backend
 * no publica el número».
 */
describe('límite por stock de la variante', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], content_version: 0, last_modified_at: null });
  });

  const agregar = (cantidad, stock) =>
    useCartStore.getState().addItem(1, cantidad, snapshot, stock);

  it('acepta una cantidad menor al stock', () => {
    expect(agregar(2, 3).ok).toBe(true);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it('acepta la cantidad exactamente igual al stock', () => {
    expect(agregar(3, 3).ok).toBe(true);
  });

  it('rechaza una cantidad mayor al stock e informa cuánto hay', () => {
    const resultado = agregar(4, 3);

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toBe(CART_ERRORS.INSUFFICIENT_STOCK);
    expect(resultado.available).toBe(3);
  });

  it('no deja acumular por encima del stock agregando de a uno', () => {
    // El caso de "agregar de nuevo un talle que ya está en el carrito": el tope
    // se mide contra el total resultante, no contra lo que se suma ahora.
    expect(agregar(3, 3).ok).toBe(true);
    const segundo = agregar(1, 3);

    expect(segundo.ok).toBe(false);
    expect(segundo.error).toBe(CART_ERRORS.INSUFFICIENT_STOCK);
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('con stock 0 deja una unidad para consultar, pero no dos (RN-40)', () => {
    expect(agregar(1, 0).ok).toBe(true);

    const segundo = agregar(1, 0);
    expect(segundo.ok).toBe(false);
    expect(segundo.available).toBe(0);
  });

  it('sin número publicado no limita en el cliente: corta el servidor', () => {
    expect(agregar(50, null).ok).toBe(true);
  });

  it('updateQuantity aplica el mismo tope que addItem', () => {
    agregar(1, 3);

    expect(useCartStore.getState().updateQuantity(1, 3, 3).ok).toBe(true);
    const excedido = useCartStore.getState().updateQuantity(1, 4, 3);

    expect(excedido.ok).toBe(false);
    expect(excedido.error).toBe(CART_ERRORS.INSUFFICIENT_STOCK);
    // La cantidad rechazada no se escribe: el estado no queda inconsistente.
    expect(useCartStore.getState().items[0].quantity).toBe(3);
  });

  it('maxOrderable espeja la regla del backend', () => {
    expect(maxOrderable(3)).toBe(3);
    expect(maxOrderable(0)).toBe(1); // RN-40: piso de una unidad para consultar
    expect(maxOrderable(null)).toBe(99); // sin número publicado, manda MAX_QUANTITY
  });
});

describe('revalidación con stock insuficiente', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], content_version: 0, last_modified_at: null });
  });

  it('recorta la línea a lo que hay en lugar de eliminarla', () => {
    useCartStore.getState().addItem(1, 5, snapshot, null);

    useCartStore.getState().applyRevalidation([
      {
        variant_id: 1,
        status: 'insufficient_stock',
        product: { slug: 'p', name: 'Producto', thumbnail_url: '/x.webp' },
        list_price: 650000,
        sale_price: 585000,
        availability: 'low_stock',
        available_quantity: 2,
      },
    ]);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].snapshot.available_quantity).toBe(2);
  });

  it('agotado durante la sesión: queda una unidad para consultar', () => {
    useCartStore.getState().addItem(1, 4, snapshot, null);

    useCartStore.getState().applyRevalidation([
      {
        variant_id: 1,
        status: 'insufficient_stock',
        product: { slug: 'p', name: 'Producto', thumbnail_url: '/x.webp' },
        list_price: 650000,
        sale_price: 585000,
        availability: 'out_of_stock',
        available_quantity: 0,
      },
    ]);

    expect(useCartStore.getState().items[0].quantity).toBe(1);
  });
});
