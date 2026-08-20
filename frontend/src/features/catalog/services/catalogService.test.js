import { describe, expect, it } from 'vitest';

import { toQueryParams } from './catalogService.js';

/**
 * §7.3: `false` es un filtro, no la ausencia de filtro. Mandar los tres
 * booleanos apagados hacía que el catálogo devolviera únicamente los productos
 * que no eran ni oferta, ni novedad, ni destacado.
 */
describe('toQueryParams', () => {
  it('omite los booleanos apagados', () => {
    const params = toQueryParams({ on_sale: false, is_new: false, is_featured: false });

    expect(params).toEqual({});
  });

  it('conserva los booleanos encendidos', () => {
    expect(toQueryParams({ on_sale: true })).toEqual({ on_sale: true });
  });

  it('omite las cadenas vacías', () => {
    const params = toQueryParams({ q: '', brand: '', category: 'botines' });

    expect(params).toEqual({ category: 'botines' });
  });

  it('conserva el cero, que es un valor legítimo', () => {
    expect(toQueryParams({ min_price: 0 })).toEqual({ min_price: 0 });
  });

  it('omite nulos e indefinidos', () => {
    expect(toQueryParams({ a: null, b: undefined, c: 'x' })).toEqual({ c: 'x' });
  });

  it('deja pasar la paginación y el orden', () => {
    const params = toQueryParams({ page: 2, per_page: 20, sort: 'price_asc' });

    expect(params).toEqual({ page: 2, per_page: 20, sort: 'price_asc' });
  });

  it('tolera la ausencia de filtros', () => {
    expect(toQueryParams()).toEqual({});
  });
});
