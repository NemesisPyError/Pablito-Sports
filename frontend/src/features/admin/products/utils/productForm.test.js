import { describe, expect, it } from 'vitest';

import { expectedVariantCount, toFormValues, toPayload, validate } from './productForm.js';

/** Forma real de `GET /admin/products/{id}`: relaciones **con identificador**. */
const DTO = {
  id: 7,
  name: 'Botín Nike Mercurial',
  slug: 'botin-nike-mercurial',
  sku: 'SKU-001',
  description: 'Un botín.',
  list_price: 720000,
  sale_price: 600000,
  sale_starts_at: '2026-07-01T10:00:00+00:00',
  sale_ends_at: '2026-07-31T10:00:00+00:00',
  availability: 'available',
  is_active: true,
  is_featured: true,
  is_new: false,
  brand: { id: 1, name: 'Nike' },
  primary_category: { id: 4, name: 'Botines' },
  gender: { id: 2, name: 'Hombre' },
  size_type: { id: 1, name: 'Calzado' },
  categories: [
    { id: 4, name: 'Botines' },
    { id: 2, name: 'Calzado' },
  ],
  sports: [{ id: 1, name: 'Fútbol' }],
  sizes: [
    { id: 5, name: '42' },
    { id: 6, name: '43' },
  ],
};

function valores(overrides) {
  return { ...toFormValues(DTO), ...overrides };
}

describe('toFormValues', () => {
  it('parte de un formulario vacío y activo cuando no hay producto', () => {
    const vacio = toFormValues(null);

    expect(vacio.name).toBe('');
    expect(vacio.is_active).toBe(true);
    expect(vacio.category_ids).toEqual([]);
  });

  it('precarga los identificadores de las relaciones', () => {
    const desde = toFormValues(DTO);

    expect(desde.brand_id).toBe('1');
    expect(desde.gender_id).toBe('2');
    expect(desde.size_type_id).toBe('1');
    expect(desde.primary_category_id).toBe('4');
  });

  it('precarga las relaciones múltiples como listas de id', () => {
    const desde = toFormValues(DTO);

    expect(desde.category_ids).toEqual([4, 2]);
    expect(desde.sport_ids).toEqual([1]);
    expect(desde.size_ids).toEqual([5, 6]);
  });

  it('tolera un producto sin relaciones opcionales', () => {
    const desde = toFormValues({ ...DTO, sports: [], sizes: [], description: null });

    expect(desde.sport_ids).toEqual([]);
    expect(desde.description).toBe('');
  });
});

describe('validate', () => {
  it('acepta un producto completo', () => {
    expect(validate(valores())).toEqual({});
  });

  it.each(['name', 'sku'])('exige %s', (campo) => {
    expect(validate(valores({ [campo]: '  ' }))[campo]).toBeDefined();
  });

  it.each(['brand_id', 'primary_category_id', 'gender_id', 'size_type_id'])(
    'exige la relación %s',
    (campo) => {
      expect(validate(valores({ [campo]: '' }))[campo]).toBeDefined();
    },
  );

  it('exige el precio de lista', () => {
    expect(validate(valores({ list_price: '' })).list_price).toBeDefined();
  });

  it('rechaza un precio de lista de cero o negativo', () => {
    expect(validate(valores({ list_price: '0' })).list_price).toBeDefined();
    expect(validate(valores({ list_price: '-5' })).list_price).toBeDefined();
  });

  it('rechaza un precio con decimales: los importes son enteros', () => {
    expect(validate(valores({ list_price: '1000.5' })).list_price).toBeDefined();
  });

  it('rechaza una oferta mayor o igual que el precio de lista', () => {
    expect(validate(valores({ list_price: '1000', sale_price: '1000' })).sale_price).toBeDefined();
    expect(validate(valores({ list_price: '1000', sale_price: '1500' })).sale_price).toBeDefined();
  });

  it('acepta una oferta menor', () => {
    expect(validate(valores({ list_price: '1000', sale_price: '800' })).sale_price).toBeUndefined();
  });

  it('acepta que no haya oferta', () => {
    expect(validate(valores({ sale_price: '' })).sale_price).toBeUndefined();
  });

  it('rechaza un fin de oferta anterior al inicio', () => {
    const errores = validate(
      valores({ sale_starts_at: '2026-07-10T10:00', sale_ends_at: '2026-07-01T10:00' }),
    );

    expect(errores.sale_ends_at).toBeDefined();
  });
});

describe('toPayload', () => {
  it('envía los obligatorios como enteros', () => {
    const payload = toPayload(valores());

    expect(payload.list_price).toBe(720000);
    expect(payload.brand_id).toBe(1);
    expect(payload.gender_id).toBe(2);
    expect(payload.size_type_id).toBe(1);
    expect(payload.primary_category_id).toBe(4);
  });

  it('incluye la categoría principal en category_ids', () => {
    // §10.4: `category_ids` "incluye a `primary_category_id`".
    const payload = toPayload(valores({ primary_category_id: '9', category_ids: [] }));

    expect(payload.category_ids).toContain(9);
  });

  it('no duplica la categoría principal si ya estaba', () => {
    const payload = toPayload(valores({ primary_category_id: '4', category_ids: [4, 2] }));

    expect(payload.category_ids.filter((id) => id === 4)).toHaveLength(1);
  });

  it('manda null y no cadena vacía en los opcionales', () => {
    const payload = toPayload(valores({ description: '  ', sale_price: '' }));

    expect(payload.description).toBeNull();
    expect(payload.sale_price).toBeNull();
  });

  it('nunca manda el slug: lo genera el backend y no se edita', () => {
    expect(toPayload(valores({ slug: 'lo-que-sea' }))).not.toHaveProperty('slug');
  });

  it('nunca manda availability: se deriva de la cantidad por variante (RN-38b)', () => {
    expect(toPayload(valores({ availability: 'available' }))).not.toHaveProperty('availability');
  });

  it('manda las fechas en ISO absoluto', () => {
    const payload = toPayload(valores({ sale_starts_at: '2026-07-01T10:00' }));

    expect(payload.sale_starts_at).toBe(new Date('2026-07-01T10:00').toISOString());
    expect(payload.sale_starts_at.endsWith('Z')).toBe(true);
  });

  it('manda las relaciones múltiples como listas de enteros', () => {
    const payload = toPayload(valores());

    expect(payload.sport_ids).toEqual([1]);
    expect(payload.size_ids).toEqual([5, 6]);
  });

  it('no inventa stock: el payload no lleva cantidad alguna', () => {
    const payload = toPayload(valores());

    expect(Object.keys(payload)).not.toContain('stock');
    expect(Object.keys(payload)).not.toContain('quantity');
  });
});

describe('expectedVariantCount', () => {
  it('sin talles no hay variantes', () => {
    expect(expectedVariantCount({ size_ids: [] })).toBe(0);
  });

  it('una variante por talle (AD-15)', () => {
    expect(expectedVariantCount({ size_ids: [1, 2, 3] })).toBe(3);
  });
});
