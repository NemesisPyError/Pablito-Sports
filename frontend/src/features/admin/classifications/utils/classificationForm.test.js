import { describe, expect, it } from 'vitest';

import { CLASSIFICATIONS } from '../config.js';
import {
  parentOptions,
  sizeNameHint,
  slugify,
  toFormValues,
  toPayload,
  validate,
} from './classificationForm.js';

const MARCA = CLASSIFICATIONS.brands;
const DEPORTE = CLASSIFICATIONS.sports;
const TALLE = CLASSIFICATIONS.sizes;
const CATEGORIA = CLASSIFICATIONS.categories;

function valores(overrides) {
  return { ...toFormValues(null), name: 'Nike', slug: 'nike', ...overrides };
}

describe('slugify', () => {
  it('quita los acentos', () => {
    expect(slugify('Fútbol')).toBe('futbol');
  });

  it('sustituye los espacios por guiones', () => {
    expect(slugify('Niño Pequeño')).toBe('nino-pequeno');
  });

  it('no deja guiones sueltos en los extremos', () => {
    expect(slugify('  Hola!  ')).toBe('hola');
  });

  it('tolera nulos', () => {
    expect(slugify(null)).toBe('');
  });
});

describe('toFormValues', () => {
  it('parte de un formulario vacío y activo', () => {
    const vacio = toFormValues(null);

    expect(vacio.name).toBe('');
    expect(vacio.is_active).toBe(true);
  });

  it('precarga los campos propios de cada recurso', () => {
    const desde = toFormValues({
      name: 'Botines',
      slug: 'botines',
      is_active: false,
      parent_id: 3,
      size_type_id: 2,
    });

    expect(desde.parent_id).toBe('3');
    expect(desde.size_type_id).toBe('2');
    expect(desde.is_active).toBe(false);
  });
});

describe('validate', () => {
  it('acepta lo mínimo', () => {
    expect(validate(valores(), MARCA)).toEqual({});
  });

  it.each(['name', 'slug'])('exige %s', (campo) => {
    expect(validate(valores({ [campo]: '  ' }), MARCA)[campo]).toBeDefined();
  });

  it('aplica el máximo de cada recurso (§10.13)', () => {
    // Un talle admite 20; una marca, 100.
    const largo = 'x'.repeat(21);

    expect(validate(valores({ name: largo, size_type_id: '1' }), TALLE).name).toBeDefined();
    expect(validate(valores({ name: largo }), MARCA).name).toBeUndefined();
  });

  it('exige el tipo de talle sólo en talles', () => {
    expect(validate(valores({ size_type_id: '' }), TALLE).size_type_id).toBeDefined();
    expect(validate(valores({ size_type_id: '' }), MARCA).size_type_id).toBeUndefined();
  });
});

describe('toPayload', () => {
  it('la marca envía los campos comunes más los de portada', () => {
    // §9.6 (v1.1.0): `tagline` y `home_position` son suyos; ninguna otra
    // clasificación los lleva.
    expect(Object.keys(toPayload(valores(), MARCA)).sort()).toEqual([
      'home_position',
      'is_active',
      'name',
      'show_in_strip',
      'slug',
      'tagline',
    ]);
  });

  it('un deporte envía sólo los campos comunes', () => {
    expect(Object.keys(toPayload(valores(), CLASSIFICATIONS.sports)).sort()).toEqual([
      'is_active',
      'name',
      'slug',
    ]);
  });

  it('añade parent_id en categorías, y null si es raíz', () => {
    expect(toPayload(valores({ parent_id: '4' }), CATEGORIA).parent_id).toBe(4);
    expect(toPayload(valores({ parent_id: '' }), CATEGORIA).parent_id).toBeNull();
  });

  it('añade size_type_id como entero en talles', () => {
    expect(toPayload(valores({ size_type_id: '2' }), TALLE).size_type_id).toBe(2);
  });

  it('no mezcla campos entre recursos', () => {
    const payload = toPayload(valores({ parent_id: '4' }), MARCA);

    expect('parent_id' in payload).toBe(false);
  });
});

describe('parentOptions', () => {
  const categorias = [
    { id: 1, name: 'Calzado', parent_id: null },
    { id: 2, name: 'Botines', parent_id: 1 },
    { id: 3, name: 'Indumentaria', parent_id: null },
  ];

  it('sólo ofrece raíces: AD-24 admite dos niveles', () => {
    expect(parentOptions(categorias).map((c) => c.id)).toEqual([1, 3]);
  });

  it('excluye a la propia categoría', () => {
    expect(parentOptions(categorias, 1).map((c) => c.id)).toEqual([3]);
  });

  it('tolera una lista ausente', () => {
    expect(parentOptions(undefined)).toEqual([]);
  });
});

// §9.6 (v1.1.0): la marca es la única clasificación que además es pieza de la
// portada. El resto son etiquetas del catálogo y no deben ganar estos campos.
describe('campos de portada de la marca', () => {
  it('una marca nueva nace sin frase ni posición', () => {
    const iniciales = toFormValues(null);

    expect(iniciales.tagline).toBe('');
    expect(iniciales.home_position).toBe('');
  });

  it('conserva la posición cero, que es la primera marca destacada', () => {
    expect(toFormValues({ home_position: 0 }).home_position).toBe('0');
  });

  it('distingue «sin bloque» de la posición cero', () => {
    expect(toPayload(valores({ home_position: '' }), MARCA).home_position).toBeNull();
    expect(toPayload(valores({ home_position: '0' }), MARCA).home_position).toBe(0);
  });

  it('rechaza una posición que no es un entero', () => {
    expect(validate(valores({ home_position: 'primera' }), MARCA).home_position).toBeTruthy();
    expect(validate(valores({ home_position: '-1' }), MARCA).home_position).toBeTruthy();
  });

  it('acepta la posición vacía', () => {
    expect(validate(valores({ home_position: '' }), MARCA).home_position).toBeUndefined();
  });

  it('una marca nueva nace dentro de la franja', () => {
    // Es lo que la franja hacía con todas las marcas hasta ahora: el alta no
    // debe obligar a tildar algo para que la marca aparezca donde siempre.
    expect(toFormValues(null).show_in_strip).toBe(true);
  });

  it('respeta la marca que fue sacada de la franja', () => {
    expect(toFormValues({ show_in_strip: false }).show_in_strip).toBe(false);
    expect(toPayload(valores({ show_in_strip: false }), MARCA).show_in_strip).toBe(false);
  });

  it('la franja es independiente del bloque propio de portada', () => {
    // Sin `home_position` la marca no tiene bloque, pero sí puede estar en la
    // franja: son dos decisiones distintas sobre la misma marca.
    const payload = toPayload(valores({ home_position: '', show_in_strip: true }), MARCA);

    expect(payload.home_position).toBeNull();
    expect(payload.show_in_strip).toBe(true);
  });

  it('rechaza una frase demasiado larga', () => {
    const larga = 'x'.repeat(256);

    expect(validate(valores({ tagline: larga }), MARCA).tagline).toBeTruthy();
  });

  it('manda la frase vacía como nulo, no como cadena', () => {
    expect(toPayload(valores({ tagline: '   ' }), MARCA).tagline).toBeNull();
  });

  it('las demás clasificaciones no llevan campos de portada', () => {
    for (const config of [DEPORTE, TALLE, CATEGORIA]) {
      const payload = toPayload(valores({ size_type_id: '1' }), config);

      expect(payload).not.toHaveProperty('tagline');
      expect(payload).not.toHaveProperty('home_position');
    }
  });

  it('una posición inválida no bloquea al resto de las clasificaciones', () => {
    expect(validate(valores({ home_position: 'primera' }), DEPORTE).home_position).toBeUndefined();
  });
});

// RN-15b (v1.5.0): el talle es texto libre, sin restricción de formato por
// tipo — cualquier valor alfanumérico razonable es válido para cualquier
// `size_type_id`.
describe('validate — talle como texto libre', () => {
  const TIPOS = [
    { id: 1, slug: 'footwear_numeric' },
    { id: 2, slug: 'apparel_alpha' },
    { id: 3, slug: 'one_size' },
  ];

  it.each([
    ['numérico', '42'],
    ['decimal', '8.5'],
    ['alfabético', 'XL'],
    ['alfanumérico', '4T'],
    ['alfanumérico con letra final', '12Y'],
    ['con barra', '35/36'],
    ['con guion', '38-39'],
    ['talle único', 'Único'],
  ])('acepta un talle %s en cualquier tipo', (_caso, nombre) => {
    expect(validate(valores({ name: nombre, size_type_id: '1' }), TALLE, TIPOS).name).toBeUndefined();
    expect(validate(valores({ name: nombre, size_type_id: '2' }), TALLE, TIPOS).name).toBeUndefined();
    expect(validate(valores({ name: nombre, size_type_id: '3' }), TALLE, TIPOS).name).toBeUndefined();
  });

  it('rechaza un talle vacío o solo espacios', () => {
    expect(validate(valores({ name: '   ', size_type_id: '1' }), TALLE, TIPOS).name).toBeDefined();
  });

  it('sin la lista de tipos, no rompe ni inventa un error', () => {
    expect(validate(valores({ name: 'L', size_type_id: '1' }), TALLE).name).toBeUndefined();
  });
});

describe('sizeNameHint', () => {
  it('da un ejemplo genérico de texto libre', () => {
    expect(sizeNameHint()).toMatchObject({ placeholder: 'Ej: 8.5, M, 35/36, Único' });
  });
});
