import { describe, expect, it } from 'vitest';

import { AVAILABILITY_LABELS, AVAILABLE, LOW_STOCK, OUT_OF_STOCK, getStockStatus } from './stock.js';

describe('getStockStatus', () => {
  it.each([
    [0, OUT_OF_STOCK],
    [1, LOW_STOCK],
    [5, LOW_STOCK],
    [6, AVAILABLE],
    [100, AVAILABLE],
  ])('cantidad %i → %s', (cantidad, esperado) => {
    expect(getStockStatus(cantidad)).toBe(esperado);
  });

  it('trata valores no numéricos como cero', () => {
    expect(getStockStatus(undefined)).toBe(OUT_OF_STOCK);
    expect(getStockStatus(null)).toBe(OUT_OF_STOCK);
    expect(getStockStatus('')).toBe(OUT_OF_STOCK);
  });
});

describe('AVAILABILITY_LABELS', () => {
  it('tiene exactamente los tres estados de v1.4.0', () => {
    expect(Object.keys(AVAILABILITY_LABELS).sort()).toEqual(
      [AVAILABLE, LOW_STOCK, OUT_OF_STOCK].sort(),
    );
  });

  it('no incluye "coming_soon"', () => {
    expect(AVAILABILITY_LABELS.coming_soon).toBeUndefined();
  });
});
