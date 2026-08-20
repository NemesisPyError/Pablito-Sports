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

// RN-15b (v1.4.0): coherencia entre el nombre del talle y su tipo.
describe('validate — formato de talle según su tipo', () => {
  const TIPOS = [
    { id: 1, slug: 'footwear_numeric' },
    { id: 2, slug: 'apparel_alpha' },
    { id: 3, slug: 'one_size' },
  ];

  it('rechaza un talle no numérico en Calzado', () => {
    const errores = validate(valores({ name: 'L', size_type_id: '1' }), TALLE, TIPOS);

    expect(errores.name).toBeDefined();
  });

  it('acepta un talle numérico en Calzado', () => {
    const errores = validate(valores({ name: '42', size_type_id: '1' }), TALLE, TIPOS);

    expect(errores.name).toBeUndefined();
  });

  it('rechaza un talle puramente numérico en Indumentaria', () => {
    const errores = validate(valores({ name: '42', size_type_id: '2' }), TALLE, TIPOS);

    expect(errores.name).toBeDefined();
  });

  it('acepta un talle alfabético en Indumentaria', () => {
    const errores = validate(valores({ name: 'XL', size_type_id: '2' }), TALLE, TIPOS);

    expect(errores.name).toBeUndefined();
  });

  it('Talle único no impone ningún formato', () => {
    expect(validate(valores({ name: '42', size_type_id: '3' }), TALLE, TIPOS).name).toBeUndefined();
    expect(validate(valores({ name: 'XL', size_type_id: '3' }), TALLE, TIPOS).name).toBeUndefined();
  });

  it('sin la lista de tipos, no rompe ni inventa un error', () => {
    expect(validate(valores({ name: 'L', size_type_id: '1' }), TALLE).name).toBeUndefined();
  });
});

describe('sizeNameHint', () => {
  it('da ejemplo numérico para Calzado', () => {
    expect(sizeNameHint('footwear_numeric')).toMatchObject({ placeholder: 'Ej: 35, 36, 42' });
  });

  it('da ejemplo alfabético para Indumentaria', () => {
    expect(sizeNameHint('apparel_alpha')).toMatchObject({ placeholder: 'Ej: XS, S, M, L, XL' });
  });

  it('no da pista para Talle único ni para un tipo desconocido', () => {
    expect(sizeNameHint('one_size')).toBeNull();
    expect(sizeNameHint(undefined)).toBeNull();
  });
});
