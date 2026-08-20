import { describe, expect, it } from 'vitest';

import {
  isoToLocalInput,
  localInputToIso,
  toFormValues,
  toPayload,
  validate,
} from './promotionForm.js';

function valores(overrides) {
  return {
    name: 'Rebaja de invierno',
    description: '',
    discount_percentage: '25',
    starts_at: '2026-06-14T09:00',
    ends_at: '2026-06-20T09:00',
    is_active: true,
    scopeType: 'brand',
    scopeId: '7',
    ...overrides,
  };
}

describe('validate', () => {
  it('acepta un formulario completo', () => {
    expect(validate(valores())).toEqual({});
  });

  it('exige el nombre', () => {
    expect(validate(valores({ name: '   ' }))).toHaveProperty('name');
  });

  it('exige el descuento dentro de 1..99 (CHECK del esquema)', () => {
    expect(validate(valores({ discount_percentage: '0' }))).toHaveProperty('discount_percentage');
    expect(validate(valores({ discount_percentage: '100' }))).toHaveProperty('discount_percentage');
    expect(validate(valores({ discount_percentage: '1' }))).not.toHaveProperty(
      'discount_percentage',
    );
    expect(validate(valores({ discount_percentage: '99' }))).not.toHaveProperty(
      'discount_percentage',
    );
  });

  it('exige la fecha de inicio', () => {
    expect(validate(valores({ starts_at: '' }))).toHaveProperty('starts_at');
  });

  it('acepta que no haya fecha de fin (RN-33)', () => {
    expect(validate(valores({ ends_at: '' }))).not.toHaveProperty('ends_at');
  });

  it('rechaza un fin anterior o igual al inicio', () => {
    expect(validate(valores({ ends_at: '2026-06-10T09:00' }))).toHaveProperty('ends_at');
    expect(validate(valores({ ends_at: '2026-06-14T09:00' }))).toHaveProperty('ends_at');
  });

  it('exige un alcance (RN-36)', () => {
    expect(validate(valores({ scopeId: '' }))).toHaveProperty('scopeId');
  });
});

describe('toPayload', () => {
  it('envía solo el campo del alcance elegido (RN-36)', () => {
    const payload = toPayload(valores({ scopeType: 'category', scopeId: '3' }));

    expect(payload.category_id).toBe(3);
    expect(payload).not.toHaveProperty('brand_id');
    expect(payload).not.toHaveProperty('product_id');
  });

  it('convierte el descuento a número', () => {
    expect(toPayload(valores()).discount_percentage).toBe(25);
  });

  it('omite la descripción vacía en lugar de mandar una cadena vacía', () => {
    expect(toPayload(valores({ description: '   ' }))).not.toHaveProperty('description');
    expect(toPayload(valores({ description: 'Temporada' })).description).toBe('Temporada');
  });

  it('manda null cuando no hay fecha de fin', () => {
    expect(toPayload(valores({ ends_at: '' })).ends_at).toBeNull();
  });

  it('envía las fechas como instante absoluto (AD-34)', () => {
    const payload = toPayload(valores());

    // La cadena del control es hora local; lo que viaja lleva zona.
    expect(payload.starts_at).toMatch(/Z$/);
    expect(new Date(payload.starts_at).getTime()).toBe(new Date('2026-06-14T09:00').getTime());
  });
});

describe('conversión de fechas', () => {
  it('ida y vuelta conserva el instante', () => {
    const local = '2026-06-14T09:00';
    const iso = localInputToIso(local);

    expect(isoToLocalInput(iso)).toBe(local);
  });

  it('tolera valores ausentes', () => {
    expect(localInputToIso('')).toBeNull();
    expect(isoToLocalInput(null)).toBe('');
    expect(isoToLocalInput('cualquier cosa')).toBe('');
  });
});

describe('toFormValues', () => {
  it('parte de un formulario vacío cuando no hay promoción', () => {
    const valores = toFormValues(null);

    expect(valores.name).toBe('');
    expect(valores.is_active).toBe(true);
    expect(valores.scopeType).toBe('brand');
  });

  it('toma el tipo y el slug del alcance del DTO', () => {
    const valores = toFormValues({
      name: 'Promo',
      discount_percentage: 30,
      starts_at: '2026-06-14T09:00:00Z',
      ends_at: null,
      is_active: false,
      scope: { type: 'category', entity: { slug: 'botines', name: 'Botines' } },
    });

    expect(valores.scopeType).toBe('category');
    expect(valores.scopeSlug).toBe('botines');
    expect(valores.discount_percentage).toBe('30');
    expect(valores.is_active).toBe(false);
    expect(valores.ends_at).toBe('');
  });
});
