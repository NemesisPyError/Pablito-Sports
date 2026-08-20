import { describe, expect, it } from 'vitest';

import {
  buildPreview,
  isDirty,
  toFormValues,
  toPayload,
  validate,
} from './whatsappTemplateForm.js';

describe('toFormValues', () => {
  it('lee las dos plantillas del DTO', () => {
    expect(toFormValues({ message_template: 'Hola {{items}} {{total}}', item_template: '{{producto}}' })).toEqual({
      message_template: 'Hola {{items}} {{total}}',
      item_template: '{{producto}}',
    });
  });

  it('devuelve cadenas vacías sin DTO', () => {
    expect(toFormValues(null)).toEqual({ message_template: '', item_template: '' });
  });
});

describe('toPayload', () => {
  it('solo incluye los dos campos del contrato', () => {
    expect(
      toPayload({ message_template: 'a', item_template: 'b', otroCampo: 'x' }),
    ).toEqual({ message_template: 'a', item_template: 'b' });
  });
});

describe('isDirty', () => {
  it('detecta cambios en cualquiera de las dos plantillas', () => {
    const inicial = { message_template: 'a', item_template: 'b' };
    expect(isDirty({ message_template: 'a', item_template: 'b' }, inicial)).toBe(false);
    expect(isDirty({ message_template: 'c', item_template: 'b' }, inicial)).toBe(true);
    expect(isDirty({ message_template: 'a', item_template: 'c' }, inicial)).toBe(true);
  });
});

describe('validate', () => {
  it('exige la plantilla del mensaje', () => {
    const errores = validate({ message_template: '', item_template: '{{producto}}' });
    expect(errores.message_template).toBe('La plantilla del mensaje es obligatoria.');
  });

  it('exige {{items}} y {{total}} en la plantilla del mensaje (RN-60)', () => {
    const errores = validate({ message_template: 'Hola {{tienda}}', item_template: 'x' });
    expect(errores.message_template).toContain('{{items}}');
    expect(errores.message_template).toContain('{{total}}');
  });

  it('acepta la plantilla del mensaje con las variables obligatorias', () => {
    const errores = validate({
      message_template: '{{items}} - {{total}}',
      item_template: 'x',
    });
    expect(errores.message_template).toBeUndefined();
  });

  it('exige la plantilla de ítem, sin exigirle variables (§12.2)', () => {
    const errores = validate({ message_template: '{{items}} {{total}}', item_template: '' });
    expect(errores.item_template).toBe('La plantilla de ítem es obligatoria.');
  });

  it('no reporta errores con ambas plantillas válidas', () => {
    expect(
      validate({ message_template: '{{items}} {{total}}', item_template: '{{producto}}' }),
    ).toEqual({});
  });
});

describe('buildPreview', () => {
  it('sustituye las variables del mensaje con los datos de ejemplo', () => {
    const texto = buildPreview({
      message_template: 'Hola {{tienda}}!\n{{items}}\nTotal: {{total}}\nConsulta: {{codigo_consulta}}',
      item_template: '{{numero}}) {{producto}} x{{cantidad}}',
    });

    expect(texto).toContain('Hola Pablito Sports!');
    expect(texto).toContain('1) Botín Adidas Predator x1');
    expect(texto).toContain('2) Remera Nike Dri-FIT x2');
    expect(texto).toContain('Total: Gs. 1.080.000');
    expect(texto).toContain('Consulta: PS-7K2QX');
  });

  it('omite etiqueta y valor juntos cuando el ítem de ejemplo no tiene talle (§13.9)', () => {
    const texto = buildPreview({
      message_template: '{{items}}',
      item_template: '{{producto}} | Talle: {{talle}}',
    });

    // El primer ítem de ejemplo sí tiene talle; el segundo no.
    expect(texto).toContain('Botín Adidas Predator | Talle: 42');
    expect(texto).toContain('Remera Nike Dri-FIT');
    expect(texto).not.toContain('Remera Nike Dri-FIT | Talle:');
  });

  it('acepta un nombre de tienda distinto', () => {
    const texto = buildPreview(
      { message_template: '{{tienda}}', item_template: '' },
      'Otra Tienda',
    );
    expect(texto).toBe('Otra Tienda');
  });
});
