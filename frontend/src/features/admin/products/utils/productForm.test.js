import { describe, expect, it } from 'vitest';

import {
  descuentoDesdePrecio,
  expectedVariantCount,
  parsedQuantity,
  precioConDescuento,
  toFormValues,
  toPayload,
  toTitleCase,
  validate,
} from './productForm.js';

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
  genders: [{ id: 2, name: 'Hombre' }],
  variants: [
    { id: 101, size: { id: 5, name: '42' }, quantity: 3, availability: 'low_stock' },
    { id: 102, size: { id: 6, name: '43' }, quantity: 0, availability: 'unavailable' },
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
    expect(desde.size_type_id).toBe('1');
    expect(desde.primary_category_id).toBe('4');
  });

  it('precarga las relaciones múltiples como listas de id', () => {
    const desde = toFormValues(DTO);

    // El DTO de prueba trae la categoría principal (id 4) también en
    // `categories` — caso real que puede llegar de datos viejos — y
    // `toFormValues` la excluye de las adicionales (ver bloque de tests
    // dedicado más abajo). Solo debería quedar la id 2.
    expect(desde.category_ids).toEqual([2]);
    expect(desde.sport_ids).toEqual([1]);
    expect(desde.size_ids).toEqual([5, 6]);
    expect(desde.gender_ids).toEqual([2]);
  });

  it('excluye la categoría principal de las adicionales al cargar (evita la duplicación)', () => {
    const desde = toFormValues(DTO);

    expect(desde.category_ids).not.toContain(4);
  });

  it('si el producto no tiene esa duplicación, no cambia nada', () => {
    const sinDuplicado = {
      ...DTO,
      categories: [{ id: 2, name: 'Calzado' }, { id: 3, name: 'Zapatillas' }],
    };
    const desde = toFormValues(sinDuplicado);

    expect(desde.category_ids).toEqual([2, 3]);
  });

  it('tolera un producto sin relaciones opcionales', () => {
    const desde = toFormValues({ ...DTO, sports: [], sizes: [], description: null });

    expect(desde.sport_ids).toEqual([]);
    expect(desde.description).toBe('');
  });

  it('precarga la cantidad de cada variante existente, por id de talle', () => {
    const desde = toFormValues(DTO);

    expect(desde.size_quantities).toEqual({ '5': '3', '6': '0' });
  });

  it('sin variantes, precarga un mapa de cantidades vacío', () => {
    const desde = toFormValues({ ...DTO, variants: [] });

    expect(desde.size_quantities).toEqual({});
  });

  it('alta (sin producto) parte sin cantidades cargadas', () => {
    expect(toFormValues(null).size_quantities).toEqual({});
  });
});

describe('toTitleCase', () => {
  it('capitaliza cada palabra y pone el resto en minúscula', () => {
    expect(toTitleCase('nike air')).toBe('Nike Air');
    expect(toTitleCase('NIKE AIR MAX')).toBe('Nike Air Max');
    expect(toTitleCase('adidas predator elite')).toBe('Adidas Predator Elite');
  });

  it('colapsa espacios repetidos', () => {
    expect(toTitleCase('nike   air   max')).toBe('Nike Air Max');
  });

  it('recorta espacios en los extremos', () => {
    expect(toTitleCase('  nike air  ')).toBe('Nike Air');
  });

  it('tolera vacío o nulo', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase(null)).toBe('');
    expect(toTitleCase(undefined)).toBe('');
  });
});

describe('parsedQuantity', () => {
  it('lee la cantidad tipeada para un talle', () => {
    expect(parsedQuantity({ size_quantities: { '5': '3' } }, 5)).toBe(3);
  });

  it('un talle sin cantidad tipeada cuenta como 0, no bloquea el guardado', () => {
    expect(parsedQuantity({ size_quantities: {} }, 5)).toBe(0);
    expect(parsedQuantity({ size_quantities: { '5': '' } }, 5)).toBe(0);
  });

  it('una cantidad negativa o inválida también cae a 0', () => {
    expect(parsedQuantity({ size_quantities: { '5': '-3' } }, 5)).toBe(0);
    expect(parsedQuantity({ size_quantities: { '5': 'abc' } }, 5)).toBe(0);
  });
});

describe('validate', () => {
  it('acepta un producto completo', () => {
    expect(validate(valores())).toEqual({});
  });

  it('exige name', () => {
    expect(validate(valores({ name: '  ' })).name).toBeDefined();
  });

  it('el SKU es opcional: en blanco no bloquea el guardado (se autogenera en toPayload)', () => {
    expect(validate(valores({ sku: '' })).sku).toBeUndefined();
    expect(validate(valores({ sku: '  ' })).sku).toBeUndefined();
  });

  it('el SKU sigue respetando el largo máximo si se escribe uno', () => {
    expect(validate(valores({ sku: 'X'.repeat(101) })).sku).toBeDefined();
  });

  it.each(['brand_id', 'primary_category_id', 'size_type_id'])(
    'exige la relación %s',
    (campo) => {
      expect(validate(valores({ [campo]: '' }))[campo]).toBeDefined();
    },
  );

  it('exige al menos un sexo (RN-09, v2.9.0: lista, no un solo id)', () => {
    expect(validate(valores({ gender_ids: [] })).gender_ids).toBeDefined();
  });

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

  it('rechaza un descuento fuera del rango 1–99', () => {
    const error = (pct) =>
      validate(valores({ list_price: '1000', discount_percentage: pct })).discount_percentage;
    expect(error('0')).toBeDefined();
    expect(error('100')).toBeDefined();
    expect(error('150')).toBeDefined();
  });

  it('rechaza un descuento que no sea entero', () => {
    const errores = validate(valores({ list_price: '1000', discount_percentage: '12.5' }));
    expect(errores.discount_percentage).toBeDefined();
  });

  it('acepta un descuento dentro del rango', () => {
    const errores = validate(valores({ list_price: '1000', discount_percentage: '20' }));
    expect(errores.discount_percentage).toBeUndefined();
  });

  it('acepta que no haya oferta', () => {
    expect(validate(valores({ discount_percentage: '' })).discount_percentage).toBeUndefined();
  });

  it('pide el precio de lista antes que el descuento: sin base no hay cálculo', () => {
    const errores = validate(valores({ list_price: '', discount_percentage: '20' }));
    expect(errores.discount_percentage).toBeDefined();
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
    const payload = toPayload(valores({ description: '  ', discount_percentage: '' }));

    expect(payload.description).toBeNull();
    expect(payload.sale_price).toBeNull();
  });

  it('traduce el descuento a precio de oferta: la API no conoce porcentajes', () => {
    const payload = toPayload(valores({ list_price: '400000', discount_percentage: '20' }));

    expect(payload.sale_price).toBe(320000);
    expect(payload).not.toHaveProperty('discount_percentage');
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
    expect(payload.gender_ids).toEqual([2]);
  });

  it('no inventa stock: el payload no lleva cantidad alguna', () => {
    const payload = toPayload(valores());

    expect(Object.keys(payload)).not.toContain('stock');
    expect(Object.keys(payload)).not.toContain('quantity');
  });

  it('normaliza el nombre a formato título, igual al crear que al editar', () => {
    expect(toPayload(valores({ name: 'nike air' })).name).toBe('Nike Air');
    expect(toPayload(valores({ name: 'NIKE AIR MAX' })).name).toBe('Nike Air Max');
    expect(toPayload(valores({ name: 'adidas predator elite' })).name).toBe(
      'Adidas Predator Elite',
    );
  });

  it('respeta un SKU escrito a mano', () => {
    expect(toPayload(valores({ sku: 'MI-SKU-1' })).sku).toBe('MI-SKU-1');
  });

  it('genera un SKU de respaldo si se deja en blanco, a partir del nombre normalizado', () => {
    const payload = toPayload(valores({ name: 'nike air', sku: '' }));

    expect(payload.sku).toMatch(/^NIKE-AIR-/);
    expect(payload.sku.length).toBeLessThanOrEqual(100);
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

describe('descuento por porcentaje', () => {
  it('calcula el precio de oferta a partir del porcentaje', () => {
    expect(precioConDescuento('400000', '20')).toBe('320000');
    expect(precioConDescuento('650000', '10')).toBe('585000');
  });

  it('redondea a entero: el guaraní no tiene decimales', () => {
    // 99999 * 0.85 = 84999.15
    expect(precioConDescuento('99999', '15')).toBe('84999');
  });

  it('devuelve vacío sin precio de lista o con un porcentaje fuera de rango', () => {
    expect(precioConDescuento('', '20')).toBe('');
    expect(precioConDescuento('1000', '')).toBe('');
    expect(precioConDescuento('1000', '0')).toBe('');
    expect(precioConDescuento('1000', '100')).toBe('');
  });

  it('reconstruye el porcentaje de un producto ya guardado', () => {
    // La base guarda el precio, no el descuento: al editar hay que volver atrás.
    expect(descuentoDesdePrecio(400000, 320000)).toBe('20');
    expect(descuentoDesdePrecio(650000, 585000)).toBe('10');
  });

  it('no inventa descuento si no hay oferta o no es menor que el de lista', () => {
    expect(descuentoDesdePrecio(1000, null)).toBe('');
    expect(descuentoDesdePrecio(1000, 1000)).toBe('');
    expect(descuentoDesdePrecio(1000, 1500)).toBe('');
  });

  it('el ciclo editar → guardar conserva el precio de oferta', () => {
    const valores = toFormValues({ ...DTO, list_price: 400000, sale_price: 320000 });

    expect(valores.discount_percentage).toBe('20');
    expect(toPayload(valores).sale_price).toBe(320000);
  });
});
