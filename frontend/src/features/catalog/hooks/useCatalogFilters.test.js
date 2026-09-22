import { describe, expect, it } from 'vitest';

import {
  GENDER_FILTER_OPTIONS,
  GENDER_FILTER_SECTIONS,
  groupGenderOptions,
  nextFiltersAfterChange,
} from './useCatalogFilters.js';

describe('nextFiltersAfterChange', () => {
  const filters = { q: '', gender: 'men', category: 'calzado', sort: 'name_asc', page: 3 };

  it('cambiar la página respeta el valor pedido, no vuelve siempre a la 1', () => {
    // Bug real: `{ ...filters, page: value, page: 1 }` deja ganar al último
    // `page` del objeto literal sin importar `key`/`value` — paginar no
    // hacía nada.
    expect(nextFiltersAfterChange(filters, 'page', 5)).toEqual({ ...filters, page: 5 });
  });

  it('cambiar cualquier otro filtro vuelve a la página 1', () => {
    expect(nextFiltersAfterChange(filters, 'gender', 'women')).toEqual({
      ...filters,
      gender: 'women',
      page: 1,
    });
  });
});

describe('GENDER_FILTER_OPTIONS', () => {
  it('ofrece exactamente los 5 sexos semilla, con su traducción exacta al español', () => {
    expect(GENDER_FILTER_OPTIONS).toEqual([
      { value: 'men', label: 'Hombre' },
      { value: 'women', label: 'Mujer' },
      { value: 'boys', label: 'Niños', group: 'Infantil' },
      { value: 'girls', label: 'Niñas', group: 'Infantil' },
      { value: 'unisex', label: 'Unisex' },
    ]);
  });

  it('cada opción usa el slug real de `genders` como value, no un id inventado', () => {
    const values = GENDER_FILTER_OPTIONS.map((option) => option.value);
    expect(values).toEqual(['men', 'women', 'boys', 'girls', 'unisex']);
  });
});

describe('groupGenderOptions', () => {
  it('agrupa las opciones consecutivas con el mismo `group` en una sección', () => {
    const opciones = [
      { value: 'men', label: 'Hombre' },
      { value: 'boys', label: 'Niños', group: 'Infantil' },
      { value: 'girls', label: 'Niñas', group: 'Infantil' },
      { value: 'unisex', label: 'Unisex' },
    ];

    expect(groupGenderOptions(opciones)).toEqual([
      { label: null, options: [{ value: 'men', label: 'Hombre' }] },
      {
        label: 'Infantil',
        options: [
          { value: 'boys', label: 'Niños', group: 'Infantil' },
          { value: 'girls', label: 'Niñas', group: 'Infantil' },
        ],
      },
      { label: null, options: [{ value: 'unisex', label: 'Unisex' }] },
    ]);
  });

  it('GENDER_FILTER_SECTIONS agrupa Niños/Niñas bajo "Infantil" y deja Hombre/Mujer/Unisex sueltos', () => {
    expect(GENDER_FILTER_SECTIONS).toEqual([
      { label: null, options: [{ value: 'men', label: 'Hombre' }] },
      { label: null, options: [{ value: 'women', label: 'Mujer' }] },
      {
        label: 'Infantil',
        options: [
          { value: 'boys', label: 'Niños', group: 'Infantil' },
          { value: 'girls', label: 'Niñas', group: 'Infantil' },
        ],
      },
      { label: null, options: [{ value: 'unisex', label: 'Unisex' }] },
    ]);
  });
});
