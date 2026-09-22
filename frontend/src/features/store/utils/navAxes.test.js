import { describe, expect, it } from 'vitest';

import { buildNavAxes, catalogHref, GENDER_AXES, SPORTS_CATEGORY_SLUG } from './navAxes.js';

const CATEGORIES = [
  {
    slug: 'calzado',
    name: 'Calzado',
    children: [
      { slug: 'botines', name: 'Botines' },
      { slug: 'zapatillas', name: 'Zapatillas' },
    ],
  },
  { slug: 'indumentaria', name: 'Indumentaria', children: [{ slug: 'remeras', name: 'Remeras' }] },
];

const ACCESSORIES = {
  slug: 'accesorios',
  name: 'Accesorios',
  children: [{ slug: 'bolsos', name: 'Bolsos y Mochilas' }],
};

const SPORTS_CATEGORY = { slug: SPORTS_CATEGORY_SLUG, name: 'Deportes', children: [] };

const BRANDS = [
  { slug: 'nike', name: 'Nike', image_url: 'https://cdn.test/nike.png' },
  { slug: 'adidas', name: 'Adidas', image_url: null },
];

const SPORTS = [
  { slug: 'futbol', name: 'Fútbol' },
  { slug: 'basquet', name: 'Básquet' },
];

describe('catalogHref', () => {
  it('compone el filtro de sexo', () => {
    expect(catalogHref({ gender: 'men,unisex' })).toBe('/catalogo?gender=men%2Cunisex');
  });

  it('compone sexo y categoría a la vez', () => {
    expect(catalogHref({ gender: 'women,unisex', category: 'botines' })).toBe(
      '/catalogo?gender=women%2Cunisex&category=botines',
    );
  });

  it('compone el filtro de ofertas', () => {
    expect(catalogHref({ onSale: true })).toBe('/catalogo?on_sale=true');
  });

  it('compone el filtro de novedades', () => {
    expect(catalogHref({ isNew: true })).toBe('/catalogo?is_new=true');
  });

  it('compone el filtro de marca, que usa la franja de la portada', () => {
    expect(catalogHref({ brand: 'nike' })).toBe('/catalogo?brand=nike');
  });

  it('compone el filtro de deporte', () => {
    expect(catalogHref({ sport: 'futbol' })).toBe('/catalogo?sport=futbol');
  });

  it('sin filtros lleva al catálogo completo', () => {
    expect(catalogHref()).toBe('/catalogo');
  });
});

describe('buildNavAxes', () => {
  it('publica los ejes de sexo, deportes, novedades y promociones cuando no hay categorías', () => {
    const axes = buildNavAxes([]);

    expect(axes.map((axis) => axis.key)).toEqual([
      'hombres',
      'mujeres',
      'ninos',
      'deportes',
      'novedades',
      'promociones',
    ]);
  });

  it('Accesorios queda entre Deportes y Novedades', () => {
    const axes = buildNavAxes([...CATEGORIES, ACCESSORIES]);

    expect(axes.map((axis) => axis.key)).toEqual([
      'hombres',
      'mujeres',
      'ninos',
      'deportes',
      'accesorios',
      'novedades',
      'promociones',
    ]);
  });

  it('Novedades no despliega panel y lleva al listado filtrado', () => {
    const novedades = buildNavAxes(CATEGORIES).find((axis) => axis.key === 'novedades');

    expect(novedades.href).toBe('/catalogo?is_new=true');
    expect(novedades.groups).toEqual([]);
  });

  it('Niños agrupa los dos sexos infantiles', () => {
    const ninos = buildNavAxes([]).find((axis) => axis.key === 'ninos');

    expect(ninos.href).toBe('/catalogo?gender=boys%2Cgirls');
  });

  it('Hombres y Mujeres arrastran los productos unisex', () => {
    const axes = buildNavAxes([]);

    expect(axes.find((a) => a.key === 'hombres').href).toContain('men%2Cunisex');
    expect(axes.find((a) => a.key === 'mujeres').href).toContain('women%2Cunisex');
  });

  it('cada eje de sexo combina su sexo con las categorías reales', () => {
    const hombres = buildNavAxes(CATEGORIES).find((axis) => axis.key === 'hombres');

    expect(hombres.groups).toHaveLength(2);
    expect(hombres.groups[0].href).toBe('/catalogo?gender=men%2Cunisex&category=calzado');
    expect(hombres.groups[0].items[0].href).toBe('/catalogo?gender=men%2Cunisex&category=botines');
  });

  it('no publica Accesorios mientras la categoría no exista', () => {
    const axes = buildNavAxes(CATEGORIES);

    expect(axes.some((axis) => axis.key === 'accesorios')).toBe(false);
  });

  it('publica Accesorios cuando la categoría existe, con sus hijas', () => {
    const axes = buildNavAxes([...CATEGORIES, ACCESSORIES]);
    const accesorios = axes.find((axis) => axis.key === 'accesorios');

    expect(accesorios.href).toBe('/catalogo?category=accesorios');
    expect(accesorios.groups[0].name).toBe('Bolsos y Mochilas');
    // Sin sexo: Accesorios es una categoría, no un eje de sexo.
    expect(accesorios.groups[0].href).toBe('/catalogo?category=bolsos');
  });

  it('Accesorios no aparece dentro de los ejes de sexo', () => {
    const hombres = buildNavAxes([...CATEGORIES, ACCESSORIES]).find(
      (axis) => axis.key === 'hombres',
    );

    expect(hombres.groups.some((group) => group.slug === 'accesorios')).toBe(false);
  });

  it('Promociones va última, sin panel y con acento', () => {
    const axes = buildNavAxes(CATEGORIES);
    const promociones = axes.at(-1);

    expect(promociones.key).toBe('promociones');
    expect(promociones.href).toBe('/catalogo?on_sale=true');
    expect(promociones.groups).toEqual([]);
    expect(promociones.accent).toBe(true);
  });

  it('tolera una categoría sin hijas', () => {
    const axes = buildNavAxes([{ slug: 'camisetas', name: 'Camisetas' }]);

    expect(axes[0].groups[0].items).toEqual([]);
  });

  it('tolera una respuesta que no es una lista', () => {
    expect(() => buildNavAxes(null)).not.toThrow();
    // Los ejes de sexo más Deportes, Novedades y Promociones, que no dependen de categorías.
    expect(buildNavAxes(null)).toHaveLength(GENDER_AXES.length + 3);
  });
});

describe('buildNavAxes — eje Deportes (v2.8.0)', () => {
  it('lista los deportes reales como enlaces planos, sin agrupar', () => {
    const deportes = buildNavAxes(CATEGORIES, [], SPORTS).find((axis) => axis.key === 'deportes');

    expect(deportes.href).toBe('/catalogo');
    expect(deportes.groups).toHaveLength(2);
    expect(deportes.groups[0]).toMatchObject({ slug: 'futbol', name: 'Fútbol', items: [] });
    expect(deportes.groups[0].href).toBe('/catalogo?sport=futbol');
  });

  it('no lleva marcas', () => {
    const deportes = buildNavAxes(CATEGORIES, BRANDS, SPORTS).find((axis) => axis.key === 'deportes');

    expect(deportes.brands).toBeUndefined();
  });

  it('sin deportes, el eje queda con una lista vacía', () => {
    const deportes = buildNavAxes(CATEGORIES).find((axis) => axis.key === 'deportes');

    expect(deportes.groups).toEqual([]);
  });

  it('tolera que no lleguen deportes', () => {
    expect(() => buildNavAxes(CATEGORIES, BRANDS)).not.toThrow();
  });
});

describe('buildNavAxes — la categoría "Deportes" no se anida en los ejes de sexo (v2.9.1)', () => {
  it('Hombres, Mujeres e Infantil no incluyen la categoría Deportes entre sus grupos', () => {
    const axes = buildNavAxes([...CATEGORIES, SPORTS_CATEGORY], [], SPORTS);

    ['hombres', 'mujeres', 'ninos'].forEach((key) => {
      const axis = axes.find((a) => a.key === key);
      expect(axis.groups.some((group) => group.slug === SPORTS_CATEGORY_SLUG)).toBe(false);
    });
  });

  it('el eje independiente Deportes sigue publicándose, alimentado por la entidad Sport', () => {
    const axes = buildNavAxes([...CATEGORIES, SPORTS_CATEGORY], [], SPORTS);
    const deportes = axes.find((axis) => axis.key === 'deportes');

    expect(deportes).toBeDefined();
    expect(deportes.groups.map((g) => g.slug)).toEqual(['futbol', 'basquet']);
  });

  it('las demás categorías raíz siguen apareciendo en los ejes de sexo', () => {
    const hombres = buildNavAxes([...CATEGORIES, SPORTS_CATEGORY], [], SPORTS).find(
      (axis) => axis.key === 'hombres',
    );

    expect(hombres.groups.map((group) => group.slug)).toEqual(['calzado', 'indumentaria']);
  });
});

describe('buildNavAxes — marcas dentro del mega-menú (v1.4.0)', () => {
  it('cada eje de sexo lleva las mismas marcas, con el filtro de sexo propio', () => {
    const axes = buildNavAxes(CATEGORIES, BRANDS);
    const hombres = axes.find((axis) => axis.key === 'hombres');
    const mujeres = axes.find((axis) => axis.key === 'mujeres');

    expect(hombres.brands).toHaveLength(2);
    expect(hombres.brands[0].href).toBe('/catalogo?gender=men%2Cunisex&brand=nike');
    expect(mujeres.brands[0].href).toBe('/catalogo?gender=women%2Cunisex&brand=nike');
  });

  it('conserva el nombre y la imagen de cada marca para el fallback tipográfico', () => {
    const hombres = buildNavAxes(CATEGORIES, BRANDS).find((axis) => axis.key === 'hombres');

    expect(hombres.brands[0]).toMatchObject({ name: 'Nike', imageUrl: 'https://cdn.test/nike.png' });
    expect(hombres.brands[1]).toMatchObject({ name: 'Adidas', imageUrl: null });
  });

  it('Accesorios, Novedades y Promociones no llevan marcas', () => {
    const axes = buildNavAxes([...CATEGORIES, ACCESSORIES], BRANDS);

    expect(axes.find((a) => a.key === 'accesorios').brands).toBeUndefined();
    expect(axes.find((a) => a.key === 'novedades').brands).toBeUndefined();
    expect(axes.find((a) => a.key === 'promociones').brands).toBeUndefined();
  });

  it('sin marcas, el eje de sexo queda con una lista vacía', () => {
    const hombres = buildNavAxes(CATEGORIES, []).find((axis) => axis.key === 'hombres');

    expect(hombres.brands).toEqual([]);
  });

  it('tolera que no lleguen marcas', () => {
    expect(() => buildNavAxes(CATEGORIES)).not.toThrow();
  });
});

/**
 * `RN-83`: los sexos de la categoría deciden en qué eje aparece. Ojo con las
 * categorías de arriba: **no tienen `genders`**, así que estos casos también
 * comprueban que el resto de la suite sigue valiendo (`AD-41`).
 */
describe('buildNavAxes con sexos por categoría', () => {
  const VESTIDOS = { slug: 'vestidos', name: 'Vestidos', genders: ['women'], children: [] };
  const BOTINES = { slug: 'botines-hombre', name: 'Botines', genders: ['men'], children: [] };

  function grupos(axes, key) {
    return axes.find((axis) => axis.key === key).groups.map((group) => group.slug);
  }

  it('muestra la categoría solo en el eje que le corresponde', () => {
    const axes = buildNavAxes([...CATEGORIES, VESTIDOS, BOTINES]);

    expect(grupos(axes, 'mujeres')).toContain('vestidos');
    expect(grupos(axes, 'mujeres')).not.toContain('botines-hombre');
    expect(grupos(axes, 'hombres')).toContain('botines-hombre');
    expect(grupos(axes, 'hombres')).not.toContain('vestidos');
  });

  it('la categoría sin sexos sigue apareciendo en los tres ejes', () => {
    const axes = buildNavAxes([...CATEGORIES, VESTIDOS]);

    for (const key of ['hombres', 'mujeres', 'ninos']) {
      expect(grupos(axes, key)).toContain('calzado');
      expect(grupos(axes, key)).toContain('indumentaria');
    }
  });

  it('la categoría unisex aparece en Hombres y en Mujeres, no en Infantil', () => {
    const unisex = { slug: 'gorras', name: 'Gorras', genders: ['unisex'], children: [] };
    const axes = buildNavAxes([unisex]);

    expect(grupos(axes, 'hombres')).toContain('gorras');
    expect(grupos(axes, 'mujeres')).toContain('gorras');
    expect(grupos(axes, 'ninos')).toEqual([]);
  });

  it('filtra las subcategorías dentro de una columna que sí aplica', () => {
    const calzado = {
      slug: 'calzado',
      name: 'Calzado',
      genders: [],
      children: [
        { slug: 'botines', name: 'Botines', genders: ['men', 'boys'] },
        { slug: 'zapatillas', name: 'Zapatillas', genders: [] },
      ],
    };
    const axes = buildNavAxes([calzado]);
    const columna = (key) =>
      axes.find((axis) => axis.key === key).groups[0].items.map((item) => item.slug);

    expect(columna('hombres')).toEqual(['botines', 'zapatillas']);
    expect(columna('mujeres')).toEqual(['zapatillas']);
  });

  it('conserva la columna cuando la raíz no aplica pero una hija sí', () => {
    const raiz = {
      slug: 'indumentaria-mujer',
      name: 'Indumentaria',
      genders: ['women'],
      children: [{ slug: 'conjuntos-nina', name: 'Conjuntos de niña', genders: ['girls'] }],
    };
    const infantil = buildNavAxes([raiz]).find((axis) => axis.key === 'ninos');

    expect(infantil.groups).toHaveLength(1);
    expect(infantil.groups[0].items.map((item) => item.slug)).toEqual(['conjuntos-nina']);
  });

  it('no expone la marca interna `aplica` en el grupo', () => {
    const axes = buildNavAxes([VESTIDOS]);

    expect(axes.find((axis) => axis.key === 'mujeres').groups[0]).not.toHaveProperty('aplica');
  });

  it('los sexos no restringen el eje de Accesorios', () => {
    const accesorios = {
      ...ACCESSORIES,
      children: [{ slug: 'bolsos', name: 'Bolsos y Mochilas', genders: ['women'] }],
    };
    const axes = buildNavAxes([...CATEGORIES, accesorios]);

    expect(grupos(axes, 'accesorios')).toEqual(['bolsos']);
  });
});
