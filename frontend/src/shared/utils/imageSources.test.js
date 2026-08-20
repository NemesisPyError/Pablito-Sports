import { describe, expect, it } from 'vitest';

import {
  BANNER_CANONICAL_WIDTH,
  BANNER_WIDTHS,
  BRAND_CANONICAL_WIDTH,
  BRAND_WIDTHS,
  buildFallbackSrcSet,
  buildSrcSet,
  CANONICAL_WIDTH,
  DERIVATIVE_WIDTHS,
  isDerivativeUrl,
  STORE_CANONICAL_WIDTH,
  STORE_WIDTHS,
  widthsFor,
} from './imageSources.js';

const CANONICA = '/uploads/12/a1b2c3d4e5f60718-800.webp';

describe('imageSources', () => {
  it('fija los tres anchos de AI-06 §17.1.1', () => {
    expect(DERIVATIVE_WIDTHS).toEqual([400, 800, 1600]);
    expect(CANONICAL_WIDTH).toBe(800);
  });

  it('reconoce la URL canónica de 800 px', () => {
    expect(isDerivativeUrl(CANONICA)).toBe(true);
  });

  it('genera el srcSet con los tres anchos en WebP', () => {
    expect(buildSrcSet(CANONICA)).toBe(
      '/uploads/12/a1b2c3d4e5f60718-400.webp 400w, ' +
        '/uploads/12/a1b2c3d4e5f60718-800.webp 800w, ' +
        '/uploads/12/a1b2c3d4e5f60718-1600.webp 1600w',
    );
  });

  it('genera el respaldo JPEG de §17.1.2', () => {
    expect(buildFallbackSrcSet(CANONICA)).toBe(
      '/uploads/12/a1b2c3d4e5f60718-400.jpg 400w, ' +
        '/uploads/12/a1b2c3d4e5f60718-800.jpg 800w, ' +
        '/uploads/12/a1b2c3d4e5f60718-1600.jpg 1600w',
    );
  });

  it('solo cambia el sufijo de ancho, nunca el resto de la ruta', () => {
    const entradas = buildSrcSet(CANONICA).split(', ');

    entradas.forEach((entrada) => {
      const [url] = entrada.split(' ');
      expect(url.startsWith('/uploads/12/a1b2c3d4e5f60718-')).toBe(true);
      expect(url).toMatch(/-(400|800|1600)\.webp$/);
    });
  });

  it('no inventa URLs cuando la ruta no sigue la convención', () => {
    // Rutas heredadas anteriores a AI-06: no se puede deducir ningún tamaño.
    for (const heredada of [
      '/uploads/products/botin-nike-mercurial-1.webp',
      '/uploads/12/a1b2c3d4e5f60718.png',
      '',
      null,
      undefined,
    ]) {
      expect(isDerivativeUrl(heredada)).toBe(false);
      expect(buildSrcSet(heredada)).toBeUndefined();
      expect(buildFallbackSrcSet(heredada)).toBeUndefined();
    }
  });

  it('una huella con dígitos no confunde al sufijo de ancho', () => {
    const conDigitos = '/uploads/7/1234567890abcdef-800.webp';

    expect(buildSrcSet(conDigitos)).toContain('/uploads/7/1234567890abcdef-1600.webp 1600w');
    expect(buildSrcSet(conDigitos)).not.toContain('1234567890abcdef-400.webp 800w');
  });
});

// §17.1.2: el espacio de banners tiene otros anchos que el de productos.
describe('imageSources en el espacio de banners', () => {
  const BANNER = '/uploads/banners/a1b2c3d4e5f60718-1600.webp';

  it('fija los anchos de banners y su canónico', () => {
    expect(BANNER_WIDTHS).toEqual([800, 1600, 2400]);
    expect(BANNER_CANONICAL_WIDTH).toBe(1600);
  });

  it('reconoce la URL canónica de 1600 px', () => {
    expect(isDerivativeUrl(BANNER)).toBe(true);
  });

  it('deduce 800, 1600 y 2400, nunca 400', () => {
    const srcSet = buildSrcSet(BANNER);

    expect(srcSet).toBe(
      '/uploads/banners/a1b2c3d4e5f60718-800.webp 800w, ' +
        '/uploads/banners/a1b2c3d4e5f60718-1600.webp 1600w, ' +
        '/uploads/banners/a1b2c3d4e5f60718-2400.webp 2400w',
    );
    // La regresión que provocaba 404: un derivado de 400 px que no existe.
    expect(srcSet).not.toContain('-400.webp');
  });

  it('el respaldo JPEG usa los mismos anchos del espacio', () => {
    expect(buildFallbackSrcSet(BANNER)).toContain(
      '/uploads/banners/a1b2c3d4e5f60718-2400.jpg 2400w',
    );
  });

  it('no reconoce un ancho que no pertenece al espacio', () => {
    // 400 es de productos: en banners no existe y no debe deducirse nada.
    expect(isDerivativeUrl('/uploads/banners/a1b2c3d4e5f60718-400.webp')).toBe(false);
  });

  it('un producto sigue usando sus propios anchos', () => {
    const producto = '/uploads/products/12/a1b2c3d4e5f60718-800.webp';

    expect(buildSrcSet(producto)).toContain('-400.webp 400w');
    expect(buildSrcSet(producto)).not.toContain('-2400.webp');
  });

  it('widthsFor distingue el espacio por la ruta', () => {
    expect(widthsFor(BANNER)).toEqual(BANNER_WIDTHS);
    expect(widthsFor('/uploads/products/12/x-800.webp')).toEqual(DERIVATIVE_WIDTHS);
    // Ruta heredada sin segmento de espacio: se asume productos.
    expect(widthsFor('/uploads/12/x-800.webp')).toEqual(DERIVATIVE_WIDTHS);
  });
});

// §17.1.2 (v1.1.0): marcas agrupa por identificador, igual que productos.
describe('imageSources en el espacio de marcas', () => {
  const MARCA = '/uploads/brands/3/a1b2c3d4e5f60718-800.webp';

  it('fija los anchos de marcas y su canónico', () => {
    expect(BRAND_WIDTHS).toEqual([400, 800, 1600]);
    expect(BRAND_CANONICAL_WIDTH).toBe(800);
  });

  it('reconoce la URL canónica de 800 px y deduce las tres', () => {
    expect(isDerivativeUrl(MARCA)).toBe(true);
    expect(buildSrcSet(MARCA)).toBe(
      '/uploads/brands/3/a1b2c3d4e5f60718-400.webp 400w, ' +
        '/uploads/brands/3/a1b2c3d4e5f60718-800.webp 800w, ' +
        '/uploads/brands/3/a1b2c3d4e5f60718-1600.webp 1600w',
    );
  });

  it('no deduce el 2400 de banners', () => {
    expect(buildSrcSet(MARCA)).not.toContain('-2400.webp');
  });

  it('widthsFor lo distingue del resto', () => {
    expect(widthsFor(MARCA)).toEqual(BRAND_WIDTHS);
  });
});

// §17.1.2 (v1.1.0): la tienda usa dos anchos y su canónico es el mayor.
describe('imageSources en el espacio de la tienda', () => {
  const HISTORIA = '/uploads/store/a1b2c3d4e5f60718-1600.webp';

  it('fija los dos anchos y su canónico', () => {
    expect(STORE_WIDTHS).toEqual([800, 1600]);
    expect(STORE_CANONICAL_WIDTH).toBe(1600);
  });

  it('deduce solo los dos anchos que el backend genera', () => {
    expect(isDerivativeUrl(HISTORIA)).toBe(true);
    expect(buildSrcSet(HISTORIA)).toBe(
      '/uploads/store/a1b2c3d4e5f60718-800.webp 800w, ' +
        '/uploads/store/a1b2c3d4e5f60718-1600.webp 1600w',
    );
  });

  it('no inventa un tercer ancho que nadie genera', () => {
    const srcSet = buildSrcSet(HISTORIA);

    expect(srcSet).not.toContain('-400.webp');
    expect(srcSet).not.toContain('-2400.webp');
  });

  it('no reconoce un ancho ajeno al espacio', () => {
    expect(isDerivativeUrl('/uploads/store/a1b2c3d4e5f60718-400.webp')).toBe(false);
  });

  it('widthsFor lo distingue del resto', () => {
    expect(widthsFor(HISTORIA)).toEqual(STORE_WIDTHS);
  });
});
