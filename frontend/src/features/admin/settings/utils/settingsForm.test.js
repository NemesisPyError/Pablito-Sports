import { describe, expect, it } from 'vitest';

import {
  isDirty,
  isValidUrl,
  missingVariables,
  toFormValues,
  toPayload,
  validate,
} from './settingsForm.js';

const MENSAJE = 'Hola {{tienda}}!\n{{items}}\nTotal: {{total}}';
const ITEM = '{{numero}}) {{producto}}';

const DTO = {
  store_name: 'Pablito Sports',
  whatsapp_number: '+595981123456',
  address: 'Av. Mariscal López 1234',
  business_hours: 'Lunes a sábado de 08:00 a 19:00',
  social_links: { instagram: 'https://instagram.com/pablitosports' },
  message_template: MENSAJE,
  item_template: ITEM,
  featured_products_count: 8,
};

function valores(overrides) {
  return { ...toFormValues(DTO), ...overrides };
}

describe('toFormValues', () => {
  it('convierte el DTO en cadenas editables', () => {
    const desde = toFormValues(DTO);

    expect(desde.store_name).toBe('Pablito Sports');
    expect(desde.featured_products_count).toBe('8');
  });

  it('convierte los nulos del DTO en cadenas vacías', () => {
    const desde = toFormValues({ ...DTO, address: null, business_hours: null, social_links: null });

    expect(desde.address).toBe('');
    expect(desde.business_hours).toBe('');
    expect(desde.socialLinks).toEqual([]);
  });

  it('despliega social_links en filas nombre → enlace', () => {
    expect(toFormValues(DTO).socialLinks).toEqual([
      { name: 'instagram', url: 'https://instagram.com/pablitosports' },
    ]);
  });

  it('tolera que no haya configuración todavía', () => {
    expect(toFormValues(null).store_name).toBe('');
  });
});

describe('validate', () => {
  it('acepta una configuración completa', () => {
    expect(validate(valores())).toEqual({});
  });

  it('exige el nombre de la tienda', () => {
    expect(validate(valores({ store_name: '  ' })).store_name).toBeDefined();
  });

  it('rechaza un nombre de más de 255 caracteres', () => {
    expect(validate(valores({ store_name: 'a'.repeat(256) })).store_name).toBeDefined();
  });

  it('exige el número de WhatsApp (RN-58)', () => {
    expect(validate(valores({ whatsapp_number: '' })).whatsapp_number).toBeDefined();
  });

  it('rechaza un número de más de 50 caracteres', () => {
    expect(validate(valores({ whatsapp_number: '9'.repeat(51) })).whatsapp_number).toBeDefined();
  });

  it('acepta que la dirección y los horarios estén vacíos', () => {
    const errores = validate(valores({ address: '', business_hours: '' }));

    expect(errores.address).toBeUndefined();
    expect(errores.business_hours).toBeUndefined();
  });

  it('exige las variables obligatorias del mensaje (RN-60)', () => {
    const errores = validate(valores({ message_template: 'Hola, sin variables' }));

    expect(errores.message_template).toContain('{{items}}');
    expect(errores.message_template).toContain('{{total}}');
  });

  it('no exige variables en la plantilla de ítem', () => {
    expect(validate(valores({ item_template: '- un ítem' })).item_template).toBeUndefined();
  });

  it('rechaza destacados en cero', () => {
    expect(
      validate(valores({ featured_products_count: '0' })).featured_products_count,
    ).toBeDefined();
  });

  it('rechaza destacados no enteros', () => {
    expect(
      validate(valores({ featured_products_count: '2.5' })).featured_products_count,
    ).toBeDefined();
  });

  it('rechaza una red con enlace inválido', () => {
    const errores = validate(valores({ socialLinks: [{ name: 'instagram', url: 'instagram' }] }));

    expect(errores.socialLinks[0]).toBeDefined();
  });

  it('rechaza una red con nombre pero sin enlace', () => {
    const errores = validate(valores({ socialLinks: [{ name: 'instagram', url: '' }] }));

    expect(errores.socialLinks[0]).toBeDefined();
  });

  it('ignora una fila de red completamente vacía', () => {
    expect(validate(valores({ socialLinks: [{ name: '', url: '' }] })).socialLinks).toBeUndefined();
  });
});

describe('isValidUrl', () => {
  it('acepta una URL absoluta', () => {
    expect(isValidUrl('https://instagram.com/tienda')).toBe(true);
  });

  it('rechaza una ruta interna: la red se abre hacia afuera', () => {
    expect(isValidUrl('/instagram')).toBe(false);
  });

  it('rechaza un esquema que no sea http o https', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
  });

  it('rechaza texto suelto', () => {
    expect(isValidUrl('instagram')).toBe(false);
  });
});

describe('missingVariables', () => {
  it('no reporta ninguna cuando están todas', () => {
    expect(missingVariables(MENSAJE)).toEqual([]);
  });

  it('reporta la que falta', () => {
    expect(missingVariables('Solo {{items}}')).toEqual(['total']);
  });
});

describe('toPayload', () => {
  it('envía los obligatorios del contrato', () => {
    const payload = toPayload(valores());

    expect(payload.store_name).toBe('Pablito Sports');
    expect(payload.whatsapp_number).toBe('+595981123456');
    expect(payload.featured_products_count).toBe(8);
  });

  it('omite los opcionales vacíos en lugar de mandar cadenas vacías', () => {
    const payload = toPayload(valores({ address: '  ', business_hours: '' }));

    expect('address' in payload).toBe(false);
    expect('business_hours' in payload).toBe(false);
  });

  it('rearma social_links como objeto', () => {
    const payload = toPayload(
      valores({
        socialLinks: [
          { name: 'instagram', url: 'https://instagram.com/t' },
          { name: 'facebook', url: 'https://facebook.com/t' },
        ],
      }),
    );

    expect(payload.social_links).toEqual({
      instagram: 'https://instagram.com/t',
      facebook: 'https://facebook.com/t',
    });
  });

  it('omite social_links cuando no queda ninguna red', () => {
    expect('social_links' in toPayload(valores({ socialLinks: [] }))).toBe(false);
  });

  it('descarta las filas de red incompletas', () => {
    const payload = toPayload(
      valores({
        socialLinks: [
          { name: 'instagram', url: 'https://instagram.com/t' },
          { name: '', url: '' },
        ],
      }),
    );

    expect(payload.social_links).toEqual({ instagram: 'https://instagram.com/t' });
  });

  it('no recorta las plantillas: los saltos son parte del formato', () => {
    const conSaltos = '\n{{items}} {{total}}\n';

    expect(toPayload(valores({ message_template: conSaltos })).message_template).toBe(conSaltos);
  });

  it('manda featured_products_count como número, no como cadena', () => {
    expect(toPayload(valores({ featured_products_count: '12' })).featured_products_count).toBe(12);
  });
});

describe('isDirty', () => {
  it('no marca cambios cuando nada se tocó', () => {
    expect(isDirty(valores(), valores())).toBe(false);
  });

  it('marca cambios al editar un campo', () => {
    expect(isDirty(valores({ store_name: 'Otro nombre' }), valores())).toBe(true);
  });

  it('ignora los espacios al final, que no se envían', () => {
    expect(isDirty(valores({ store_name: 'Pablito Sports   ' }), valores())).toBe(false);
  });

  it('ignora una fila de red en blanco recién agregada', () => {
    const conFilaVacia = valores({
      socialLinks: [...toFormValues(DTO).socialLinks, { name: '', url: '' }],
    });

    expect(isDirty(conFilaVacia, valores())).toBe(false);
  });
});

// §9.12 (v1.1.0): correo y contenido institucional.
describe('correo e historia', () => {
  it('parten vacíos cuando la configuración no los trae', () => {
    const iniciales = toFormValues({});

    expect(iniciales.email).toBe('');
    expect(iniciales.about_title).toBe('');
    expect(iniciales.about_text).toBe('');
  });

  it('acepta la ausencia de correo: es opcional', () => {
    expect(validate(valores({ email: '' })).email).toBeUndefined();
  });

  it('rechaza un correo con forma inválida', () => {
    for (const invalido of ['hola', 'hola@', '@tienda.com', 'hola tienda.com']) {
      expect(validate(valores({ email: invalido })).email).toBeTruthy();
    }
  });

  it('acepta un correo bien formado', () => {
    expect(validate(valores({ email: 'hola@pablitosports.com' })).email).toBeUndefined();
  });

  it('exige título cuando hay texto de historia', () => {
    const errores = validate(valores({ about_text: 'Nacimos en 2015.', about_title: '' }));

    expect(errores.about_title).toBeTruthy();
  });

  it('admite el título sin texto: la sección se completa después', () => {
    expect(validate(valores({ about_title: 'Nuestra historia' })).about_title).toBeUndefined();
  });

  it('omite del payload lo que quedó vacío', () => {
    const payload = toPayload(valores({ email: '', about_title: '', about_text: '' }));

    expect(payload).not.toHaveProperty('email');
    expect(payload).not.toHaveProperty('about_title');
    expect(payload).not.toHaveProperty('about_text');
  });

  it('envía lo cargado', () => {
    const payload = toPayload(
      valores({
        email: '  hola@pablitosports.com ',
        about_title: ' Nuestra historia ',
        about_text: 'Primera línea.\nSegunda línea.',
      }),
    );

    expect(payload.email).toBe('hola@pablitosports.com');
    expect(payload.about_title).toBe('Nuestra historia');
    // El texto no se recorta: los saltos son parte de la redacción.
    expect(payload.about_text).toBe('Primera línea.\nSegunda línea.');
  });
});
