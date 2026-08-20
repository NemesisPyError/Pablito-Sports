import { describe, expect, it } from 'vitest';

import {
  RESOLUTION,
  STATUS,
  diffItem,
  estimatedTotal,
  resolveRevalidation,
} from './discrepancies.js';

function local(overrides = {}) {
  return {
    variant_id: 1,
    quantity: 2,
    snapshot: {
      slug: 'botin-nike-mercurial',
      name: 'Botín Nike Mercurial',
      brand: 'Nike',
      size: '42',
      thumbnail_url: '/uploads/a.webp',
      list_price: 650000,
      sale_price: 585000,
      availability: 'available',
      ...overrides,
    },
  };
}

function server(overrides = {}) {
  return {
    variant_id: 1,
    status: STATUS.OK,
    product: {
      slug: 'botin-nike-mercurial',
      name: 'Botín Nike Mercurial',
      thumbnail_url: '/a.webp',
    },
    list_price: 650000,
    sale_price: 585000,
    discount_percentage: 10,
    availability: 'available',
    quantity: 2,
    ...overrides,
  };
}

describe('matriz AD-25', () => {
  it('no reporta cambios cuando nada se movió', () => {
    expect(diffItem(local(), server())).toEqual([]);
  });

  it('detecta que el precio cambió', () => {
    const changes = diffItem(local(), server({ sale_price: 500000 }));

    expect(changes).toEqual([{ status: STATUS.PRICE_CHANGED, from: 585000, to: 500000 }]);
    expect(RESOLUTION[STATUS.PRICE_CHANGED]).toBe('keep');
  });

  it('distingue oferta vencida de cambio de precio', () => {
    // RN-32: la oferta dejó de estar vigente y rige el precio de lista.
    const changes = diffItem(local(), server({ sale_price: null, discount_percentage: null }));

    expect(changes).toEqual([{ status: STATUS.SALE_ENDED, from: 585000, to: 650000 }]);
  });

  it('detecta que la disponibilidad cambió y mantiene el ítem', () => {
    // RN-40: sin stock se puede seguir consultando.
    const changes = diffItem(local(), server({ availability: 'out_of_stock' }));

    expect(changes).toEqual([
      { status: STATUS.AVAILABILITY_CHANGED, from: 'available', to: 'out_of_stock' },
    ]);
    expect(RESOLUTION[STATUS.AVAILABILITY_CHANGED]).toBe('keep');
  });

  it('acumula precio y disponibilidad cuando se mueven juntos', () => {
    const changes = diffItem(local(), server({ sale_price: 400000, availability: 'low_stock' }));

    expect(changes.map((change) => change.status)).toEqual([
      STATUS.PRICE_CHANGED,
      STATUS.AVAILABILITY_CHANGED,
    ]);
  });

  it('actualiza nombre e imagen sin avisar', () => {
    // AD-28, excepción: no afectan la decisión de compra.
    const changes = diffItem(
      local(),
      server({ product: { slug: 's', name: 'Otro nombre', thumbnail_url: '/otra.webp' } }),
    );

    expect(changes).toEqual([]);
  });

  it.each([
    [STATUS.PRODUCT_HIDDEN, 'remove'],
    [STATUS.PRODUCT_DELETED, 'remove'],
    [STATUS.VARIANT_REMOVED, 'reselect'],
  ])('resuelve %s con la acción %s', (status, action) => {
    const resolved = resolveRevalidation([local()], [server({ status, product: null })]);

    expect(resolved.items[0].resolution).toBe(action);
    expect(resolved.removable).toEqual([1]);
    expect(resolved.hasBlockingChanges).toBe(true);
  });
});

describe('bloqueo del envío (RN-77, RN-78)', () => {
  it('no bloquea cuando no hay discrepancias', () => {
    const resolved = resolveRevalidation([local()], [server()]);

    expect(resolved.hasBlockingChanges).toBe(false);
    expect(resolved.removable).toEqual([]);
  });

  it('bloquea ante un cambio de precio', () => {
    const resolved = resolveRevalidation([local()], [server({ sale_price: 500000 })]);

    expect(resolved.hasBlockingChanges).toBe(true);
  });

  it('bloquea ante un cambio de disponibilidad', () => {
    const resolved = resolveRevalidation([local()], [server({ availability: 'out_of_stock' })]);

    expect(resolved.hasBlockingChanges).toBe(true);
  });
});

describe('total estimado (RN-55)', () => {
  it('usa el precio recién revalidado, no el del snapshot', () => {
    const resolved = resolveRevalidation([local()], [server({ sale_price: 500000 })]);

    expect(estimatedTotal(resolved.items)).toBe(1000000);
  });
});
