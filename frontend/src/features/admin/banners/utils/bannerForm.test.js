import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PLACEMENT,
  isValidLink,
  MAX_BUTTON_LABEL_LENGTH,
  toFormData,
  toFormValues,
  validate,
} from './bannerForm.js';

function valores(overrides) {
  return {
    title: 'Rebajas de invierno',
    subtitle: '',
    link_url: '',
    button_label: '',
    placement: DEFAULT_PLACEMENT,
    position: '0',
    starts_at: '',
    ends_at: '',
    is_active: true,
    ...overrides,
  };
}

describe('toFormValues', () => {
  it('parte de un formulario vacío y activo cuando no hay banner', () => {
    expect(toFormValues(null)).toEqual({
      title: '',
      subtitle: '',
      link_url: '',
      button_label: '',
      placement: DEFAULT_PLACEMENT,
      position: '0',
      starts_at: '',
      ends_at: '',
      is_active: true,
    });
  });

  it('convierte los nulos del DTO en cadenas vacías', () => {
    const desde = toFormValues({
      title: 'Portada',
      subtitle: null,
      link_url: null,
      button_label: null,
      placement: 'hero',
      position: 3,
      starts_at: null,
      ends_at: null,
      is_active: false,
    });

    expect(desde).toEqual({
      title: 'Portada',
      subtitle: '',
      link_url: '',
      button_label: '',
      placement: 'hero',
      position: '3',
      starts_at: '',
      ends_at: '',
      is_active: false,
    });
  });
});

describe('validate', () => {
  it('acepta el mínimo: título, posición e imagen', () => {
    expect(validate(valores())).toEqual({});
  });

  it('exige el título', () => {
    expect(validate(valores({ title: '   ' })).title).toBeDefined();
  });

  it('rechaza un título de más de 255 caracteres', () => {
    expect(validate(valores({ title: 'a'.repeat(256) })).title).toBeDefined();
  });

  it('exige la posición', () => {
    expect(validate(valores({ position: '' })).position).toBeDefined();
  });

  it('rechaza una posición negativa', () => {
    expect(validate(valores({ position: '-1' })).position).toBeDefined();
  });

  it('rechaza una posición decimal, que el backend no admite', () => {
    expect(validate(valores({ position: '1.5' })).position).toBeDefined();
  });

  it('acepta la posición cero', () => {
    expect(validate(valores({ position: '0' })).position).toBeUndefined();
  });

  it('acepta que no haya fechas (RN-74)', () => {
    const errores = validate(valores({ starts_at: '', ends_at: '' }));

    expect(errores.starts_at).toBeUndefined();
    expect(errores.ends_at).toBeUndefined();
  });

  it('acepta un inicio sin fin', () => {
    expect(validate(valores({ starts_at: '2026-07-01T10:00' })).ends_at).toBeUndefined();
  });

  it('rechaza un fin anterior al inicio', () => {
    const errores = validate(
      valores({ starts_at: '2026-07-10T10:00', ends_at: '2026-07-01T10:00' }),
    );

    expect(errores.ends_at).toBeDefined();
  });

  it('rechaza un fin igual al inicio: el CHECK exige que sea posterior', () => {
    const errores = validate(
      valores({ starts_at: '2026-07-10T10:00', ends_at: '2026-07-10T10:00' }),
    );

    expect(errores.ends_at).toBeDefined();
  });

  it('exige la imagen cuando no hay ninguna', () => {
    expect(validate(valores(), { hasImage: false }).image).toBeDefined();
  });

  it('no exige la imagen cuando ya hay una cargada', () => {
    expect(validate(valores(), { hasImage: true }).image).toBeUndefined();
  });

  it('rechaza un enlace de más de 500 caracteres', () => {
    const largo = `https://ejemplo.com/${'a'.repeat(500)}`;

    expect(validate(valores({ link_url: largo })).link_url).toBeDefined();
  });
});

describe('isValidLink', () => {
  it('acepta que esté vacío, porque es opcional', () => {
    expect(isValidLink('')).toBe(true);
  });

  it('acepta una URL absoluta', () => {
    expect(isValidLink('https://pablitosports.com/ofertas')).toBe(true);
  });

  it('acepta una ruta interna, que es lo que consume el router', () => {
    expect(isValidLink('/productos/botines')).toBe(true);
  });

  it('rechaza texto suelto', () => {
    expect(isValidLink('ofertas')).toBe(false);
  });

  it('rechaza un esquema que no sea http o https', () => {
    expect(isValidLink('javascript:alert(1)')).toBe(false);
  });

  it('rechaza una URL sin protocolo, que el navegador resolvería a otro origen', () => {
    expect(isValidLink('//otro-sitio.com')).toBe(false);
  });
});

describe('toFormData', () => {
  it('envía siempre título, posición y estado', () => {
    const datos = toFormData(valores({ title: '  Portada  ', position: '2' }), null);

    expect(datos.get('title')).toBe('Portada');
    expect(datos.get('position')).toBe('2');
    expect(datos.get('is_active')).toBe('true');
  });

  it('envía is_active en false, porque omitirlo lo dejaría activo', () => {
    const datos = toFormData(valores({ is_active: false }), null);

    expect(datos.get('is_active')).toBe('false');
  });

  it('omite los opcionales vacíos en lugar de mandar cadenas vacías', () => {
    const datos = toFormData(valores(), null);

    expect(datos.has('subtitle')).toBe(false);
    expect(datos.has('link_url')).toBe(false);
    expect(datos.has('starts_at')).toBe(false);
    expect(datos.has('ends_at')).toBe(false);
  });

  it('omite el archivo cuando no se reemplaza la imagen', () => {
    expect(toFormData(valores(), null).has('image')).toBe(false);
  });

  it('adjunta el archivo cuando se elige uno', () => {
    const archivo = new File(['x'], 'banner.webp', { type: 'image/webp' });
    const datos = toFormData(valores(), archivo);

    expect(datos.get('image')).toBe(archivo);
  });

  it('manda las fechas en ISO absoluto, no en la hora local del control', () => {
    const datos = toFormData(valores({ starts_at: '2026-07-01T10:00' }), null);
    const enviado = datos.get('starts_at');

    expect(enviado).toBe(new Date('2026-07-01T10:00').toISOString());
    expect(enviado.endsWith('Z')).toBe(true);
  });
});

// §9.11 (v1.1.0): la pieza declara en qué zona de la portada se muestra.
describe('zona y botón', () => {
  it('una pieza nueva nace en la portada principal', () => {
    expect(toFormValues(null).placement).toBe('hero');
  });

  it('conserva la zona de la pieza que se edita', () => {
    expect(toFormValues({ title: 'x', placement: 'promo' }).placement).toBe('promo');
  });

  it('una zona ajena al conjunto cerrado no pasa la validación', () => {
    expect(validate(valores({ placement: 'portada' })).placement).toBeTruthy();
  });

  it('acepta las tres zonas declaradas', () => {
    for (const zona of ['hero', 'news', 'promo']) {
      expect(validate(valores({ placement: zona })).placement).toBeUndefined();
    }
  });

  it('rechaza un texto de botón demasiado largo', () => {
    const largo = 'x'.repeat(MAX_BUTTON_LABEL_LENGTH + 1);

    expect(
      validate(valores({ button_label: largo, link_url: '/catalogo' })).button_label,
    ).toBeTruthy();
  });

  it('rechaza un botón sin enlace, que no llevaría a ninguna parte', () => {
    expect(validate(valores({ button_label: 'Ver más' })).button_label).toBeTruthy();
  });

  it('acepta el botón cuando hay enlace', () => {
    const errores = validate(valores({ button_label: 'Ver más', link_url: '/catalogo' }));

    expect(errores.button_label).toBeUndefined();
  });

  it('la zona siempre viaja, para que mover una pieza no la devuelva al hero', () => {
    const datos = toFormData(valores({ placement: 'news' }), null);

    expect(datos.get('placement')).toBe('news');
  });

  it('el texto del botón viaja solo si se cargó', () => {
    expect(toFormData(valores(), null).has('button_label')).toBe(false);
    expect(
      toFormData(valores({ button_label: 'Comprar', link_url: '/catalogo' }), null).get(
        'button_label',
      ),
    ).toBe('Comprar');
  });
});
