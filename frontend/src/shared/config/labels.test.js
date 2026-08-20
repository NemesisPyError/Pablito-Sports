import { describe, expect, it } from 'vitest';

import { translateGender, translateSizeType } from './labels.js';

describe('translateGender', () => {
  it.each([
    ['men', 'Hombre'],
    ['women', 'Mujer'],
    ['unisex', 'Unisex'],
    ['boys', 'Niño'],
    ['girls', 'Niña'],
  ])('%s → %s', (slug, esperado) => {
    expect(translateGender(slug)).toBe(esperado);
  });

  it('un slug desconocido se muestra tal cual, no se oculta', () => {
    expect(translateGender('inventado')).toBe('inventado');
  });
});

describe('translateSizeType', () => {
  it.each([
    ['footwear_numeric', 'Calzado'],
    ['apparel_alpha', 'Indumentaria'],
    ['one_size', 'Talle único'],
  ])('%s → %s', (slug, esperado) => {
    expect(translateSizeType(slug)).toBe(esperado);
  });

  it('un slug desconocido se muestra tal cual, no se oculta', () => {
    expect(translateSizeType('inventado')).toBe('inventado');
  });
});
