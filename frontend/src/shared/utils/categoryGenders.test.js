import { describe, expect, it } from 'vitest';

import { appliesToGender, visibleCategories } from './categoryGenders.js';

describe('appliesToGender', () => {
  it('acepta la categoría cuando comparte un sexo con el eje', () => {
    expect(appliesToGender({ genders: ['men'] }, 'men,unisex')).toBe(true);
  });

  it('acepta la categoría unisex en el eje de hombres y en el de mujeres', () => {
    expect(appliesToGender({ genders: ['unisex'] }, 'men,unisex')).toBe(true);
    expect(appliesToGender({ genders: ['unisex'] }, 'women,unisex')).toBe(true);
  });

  it('rechaza la categoría cuando no comparte ningún sexo', () => {
    expect(appliesToGender({ genders: ['women'] }, 'men,unisex')).toBe(false);
    expect(appliesToGender({ genders: ['boys', 'girls'] }, 'men,unisex')).toBe(false);
  });

  // `AD-41`: es la regla que hace que la migración no cambie nada al desplegar.
  it('acepta la categoría sin sexos tildados: no tiene restricción', () => {
    expect(appliesToGender({ genders: [] }, 'men,unisex')).toBe(true);
    expect(appliesToGender({}, 'women,unisex')).toBe(true);
    expect(appliesToGender(undefined, 'boys,girls')).toBe(true);
  });

  it('no restringe cuando no se pide ningún sexo', () => {
    expect(appliesToGender({ genders: ['women'] }, '')).toBe(true);
    expect(appliesToGender({ genders: ['women'] }, undefined)).toBe(true);
  });

  it('tolera espacios y comas sobrantes en la lista de sexos', () => {
    expect(appliesToGender({ genders: ['men'] }, ' men , unisex ,')).toBe(true);
  });
});

describe('visibleCategories', () => {
  const CATEGORIAS = [
    { slug: 'calzado', name: 'Calzado', genders: [], children: [] },
    { slug: 'vestidos', name: 'Vestidos', genders: ['women'], children: [] },
    {
      slug: 'conjuntos',
      name: 'Conjuntos',
      genders: ['women'],
      children: [{ slug: 'conjuntos-nino', name: 'Conjuntos de niño', genders: ['boys'] }],
    },
  ];

  it('deja pasar las categorías sin restricción', () => {
    expect(visibleCategories(CATEGORIAS, 'men,unisex').map((c) => c.slug)).toContain('calzado');
  });

  it('esconde la categoría que no aplica al sexo pedido', () => {
    const slugs = visibleCategories(CATEGORIAS, 'men,unisex').map((c) => c.slug);
    expect(slugs).not.toContain('vestidos');
  });

  it('conserva la raíz que no aplica si alguna hija sí aplica (`AD-29`)', () => {
    expect(visibleCategories(CATEGORIAS, 'boys,girls').map((c) => c.slug)).toContain('conjuntos');
  });

  it('conserva la categoría ya elegida aunque no aplique, para poder quitarla', () => {
    const slugs = visibleCategories(CATEGORIAS, 'men,unisex', 'vestidos').map((c) => c.slug);
    expect(slugs).toContain('vestidos');
  });

  it('devuelve una lista vacía sin categorías', () => {
    expect(visibleCategories(undefined, 'men')).toEqual([]);
  });
});
