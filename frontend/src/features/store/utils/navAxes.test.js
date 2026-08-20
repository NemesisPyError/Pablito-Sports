import { describe, expect, it } from 'vitest';

import { buildNavAxes, catalogHref, GENDER_AXES } from './navAxes.js';

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

const BRANDS = [
  { slug: 'nike', name: 'Nike', image_url: 'https://cdn.test/nike.png' },
  { slug: 'adidas', name: 'Adidas', image_url: null },
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

  it('sin filtros lleva al catálogo completo', () => {
    expect(catalogHref()).toBe('/catalogo');
  });
});

describe('buildNavAxes', () => {
  it('publica los ejes de sexo, novedades y promociones cuando no hay categorías', () => {
    const axes = buildNavAxes([]);

    expect(axes.map((axis) => axis.key)).toEqual([
      'hombres',
      'mujeres',
      'ninos',
      'novedades',
      'promociones',
    ]);
  });

  it('Accesorios queda entre los ejes de sexo y Novedades', () => {
    const axes = buildNavAxes([...CATEGORIES, ACCESSORIES]);

    expect(axes.map((axis) => axis.key)).toEqual([
      'hombres',
      'mujeres',
      'ninos',
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
    // Los ejes de sexo más Novedades y Promociones, que no dependen de datos.
    expect(buildNavAxes(null)).toHaveLength(GENDER_AXES.length + 2);
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
