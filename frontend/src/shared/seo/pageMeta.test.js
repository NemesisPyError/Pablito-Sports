import { describe, expect, it } from 'vitest';

import {
  buildCanonical,
  buildRobots,
  catalogMeta,
  DEFAULT_SHARE_IMAGE,
  homeMeta,
  isFilteredCatalog,
  isIndexable,
  productMeta,
  resolveMeta,
  truncate,
} from './pageMeta.js';

const ORIGEN = 'https://pablitosports.com';
const TIENDA = { store_name: 'Pablito Sports', address: 'Av. Mariscal López 1234' };

describe('isIndexable (§17.3)', () => {
  it.each([
    ['/', ''],
    ['/catalogo', ''],
    ['/producto/botin-nike', ''],
    ['/nosotros', ''],
  ])('indexa %s', (pathname, search) => {
    expect(isIndexable(pathname, search)).toBe(true);
  });

  it.each([
    ['/carrito', ''],
    ['/admin/dashboard', ''],
    ['/catalogo', '?brand=nike'],
    ['/catalogo', '?pagina=2'],
  ])('no indexa %s%s', (pathname, search) => {
    expect(isIndexable(pathname, search)).toBe(false);
  });
});

describe('isFilteredCatalog', () => {
  it('el catálogo desnudo no cuenta como filtrado', () => {
    expect(isFilteredCatalog('/catalogo', '')).toBe(false);
  });

  it('cualquier parámetro lo vuelve filtrado', () => {
    expect(isFilteredCatalog('/catalogo', '?brand=nike')).toBe(true);
  });

  it('no aplica fuera del catálogo', () => {
    expect(isFilteredCatalog('/producto/x', '?ref=algo')).toBe(false);
  });
});

describe('buildCanonical (§17.3)', () => {
  it('la home es canónica de sí misma', () => {
    expect(buildCanonical('/', '', ORIGEN)).toBe(`${ORIGEN}/`);
  });

  it('la ficha de producto es canónica de sí misma', () => {
    expect(buildCanonical('/producto/botin-nike', '', ORIGEN)).toBe(
      `${ORIGEN}/producto/botin-nike`,
    );
  });

  it('el catálogo filtrado canonicaliza al catálogo desnudo', () => {
    expect(buildCanonical('/catalogo', '?brand=nike&size=42', ORIGEN)).toBe(`${ORIGEN}/catalogo`);
  });

  it('el catálogo paginado también', () => {
    expect(buildCanonical('/catalogo', '?pagina=3', ORIGEN)).toBe(`${ORIGEN}/catalogo`);
  });

  it('el carrito no tiene canónica', () => {
    expect(buildCanonical('/carrito', '', ORIGEN)).toBeNull();
  });

  it('el panel tampoco', () => {
    expect(buildCanonical('/admin/productos', '', ORIGEN)).toBeNull();
  });
});

describe('buildRobots', () => {
  it('indexa y sigue lo indexable', () => {
    expect(buildRobots('/producto/x', '')).toBe('index,follow');
  });

  it('no indexa pero sigue lo no indexable', () => {
    // `follow`: los enlaces de un catálogo filtrado llevan a fichas que sí
    // queremos que se rastreen.
    expect(buildRobots('/catalogo', '?brand=nike')).toBe('noindex,follow');
  });
});

describe('truncate', () => {
  it('deja intacto lo que ya cabe', () => {
    expect(truncate('Corto', 160)).toBe('Corto');
  });

  it('normaliza los espacios', () => {
    expect(truncate('  hola   mundo \n ')).toBe('hola mundo');
  });

  it('corta en palabra completa y añade puntos suspensivos', () => {
    const largo = 'palabra '.repeat(40);
    const recortado = truncate(largo, 50);

    expect(recortado.length).toBeLessThanOrEqual(50);
    expect(recortado.endsWith('…')).toBe(true);
    expect(recortado).not.toMatch(/pala…$/);
  });

  it('tolera nulos', () => {
    expect(truncate(null)).toBe('');
  });
});

describe('metadatos por pantalla', () => {
  it('la home nombra la tienda', () => {
    expect(homeMeta(TIENDA).title).toContain('Pablito Sports');
  });

  it('la home cae en un nombre por defecto sin configuración', () => {
    expect(homeMeta(null).title).toContain('Pablito Sports');
  });

  it('el catálogo informa el total cuando lo hay', () => {
    expect(catalogMeta(TIENDA, { total: 120 }).description).toContain('120');
  });

  it('el catálogo funciona sin total', () => {
    expect(catalogMeta(TIENDA, {}).description).toBeTruthy();
  });

  it('el producto compone nombre, marca y tienda', () => {
    const meta = productMeta(
      { name: 'Botín Mercurial', brand: { name: 'Nike' }, description: 'Un botín.' },
      TIENDA,
    );

    expect(meta.title).toBe('Botín Mercurial · Nike · Pablito Sports');
    expect(meta.ogType).toBe('product');
  });

  it('el producto no publica el precio: cambia con las promociones', () => {
    const meta = productMeta(
      { name: 'Botín', list_price: 450000, sale_price: 380000, description: 'Un botín.' },
      TIENDA,
    );

    expect(meta.description).not.toContain('450');
    expect(meta.description).not.toContain('380');
  });

  it('el producto toma la primera imagen para Open Graph', () => {
    const meta = productMeta({ name: 'X', images: [{ image_url: '/uploads/x-800.webp' }] }, TIENDA);

    expect(meta.image).toBe('/uploads/x-800.webp');
  });

  it('tolera que el producto no haya llegado todavía', () => {
    expect(productMeta(null, TIENDA).title).toBe('Pablito Sports');
  });
});

describe('resolveMeta', () => {
  const base = { title: 'Título', description: 'Descripción', ogType: 'product' };

  it('absolutiza la imagen relativa, que Open Graph exige absoluta', () => {
    const resuelto = resolveMeta(
      { ...base, image: '/uploads/x-800.webp' },
      { pathname: '/producto/x', search: '', origin: ORIGEN, storeName: 'Pablito Sports' },
    );

    expect(resuelto.og.image).toBe(`${ORIGEN}/uploads/x-800.webp`);
  });

  it('respeta una imagen ya absoluta', () => {
    const resuelto = resolveMeta(
      { ...base, image: 'https://cdn.test/x.webp' },
      { pathname: '/producto/x', search: '', origin: ORIGEN },
    );

    expect(resuelto.og.image).toBe('https://cdn.test/x.webp');
  });

  it('sin imagen propia cae a la de marca, así que la tarjeta nunca sale sin imagen', () => {
    const sin = resolveMeta(base, { pathname: '/producto/x', search: '', origin: ORIGEN });

    expect(sin.og.image).toBe(`${ORIGEN}${DEFAULT_SHARE_IMAGE}`);
    expect(sin.twitter.image).toBe(`${ORIGEN}${DEFAULT_SHARE_IMAGE}`);
    expect(sin.twitter.card).toBe('summary_large_image');
  });

  it('la imagen propia gana sobre la de marca', () => {
    const con = resolveMeta(
      { ...base, image: '/x-800.webp' },
      { pathname: '/producto/x', search: '', origin: ORIGEN },
    );

    expect(con.og.image).toBe(`${ORIGEN}/x-800.webp`);
    expect(con.twitter.card).toBe('summary_large_image');
  });

  it('og:url usa la canónica cuando existe', () => {
    const resuelto = resolveMeta(base, {
      pathname: '/catalogo',
      search: '?brand=nike',
      origin: ORIGEN,
    });

    expect(resuelto.og.url).toBe(`${ORIGEN}/catalogo`);
  });

  it('sin canónica, og:url cae en la URL real', () => {
    const resuelto = resolveMeta(base, { pathname: '/carrito', search: '', origin: ORIGEN });

    expect(resuelto.canonical).toBeNull();
    expect(resuelto.og.url).toBe(`${ORIGEN}/carrito`);
  });

  it('marca noindex la pantalla que no se indexa', () => {
    expect(resolveMeta(base, { pathname: '/carrito', search: '', origin: ORIGEN }).robots).toBe(
      'noindex,follow',
    );
  });
});
