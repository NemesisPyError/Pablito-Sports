import { describe, expect, it } from 'vitest';

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_DISCOUNT,
  MAX_NAME_LENGTH,
  MIN_DISCOUNT,
  toFormData,
  toFormValues,
  validate,
} from './bankForm.js';

function valores(overrides) {
  return {
    name: 'Banco X',
    discount_percentage: '20',
    position: '0',
    is_active: true,
    ...overrides,
  };
}

describe('toFormValues', () => {
  it('parte de un formulario vacío y activo cuando no hay banco', () => {
    expect(toFormValues(null)).toEqual({
      name: '',
      description: '',
      discount_percentage: '',
      position: '0',
      is_active: true,
    });
  });

  it('precarga los campos desde el DTO', () => {
    const desde = toFormValues({
      id: 1,
      name: 'Banco X',
      description: 'Reintegro los fines de semana.',
      discount_percentage: 25,
      image_url: '/uploads/banks/x-800.webp',
      position: 3,
      is_active: false,
    });

    expect(desde).toEqual({
      name: 'Banco X',
      description: 'Reintegro los fines de semana.',
      discount_percentage: '25',
      position: '3',
      is_active: false,
    });
  });

  it('la descripción ausente en el DTO se precarga vacía', () => {
    expect(toFormValues({ name: 'Banco X', discount_percentage: 25 }).description).toBe('');
  });
});

describe('validate', () => {
  it('acepta lo mínimo con imagen', () => {
    expect(validate(valores(), { hasImage: true })).toEqual({});
  });

  it('exige el nombre', () => {
    expect(validate(valores({ name: '  ' }), { hasImage: true }).name).toBeDefined();
  });

  it('rechaza un nombre demasiado largo', () => {
    const largo = 'x'.repeat(MAX_NAME_LENGTH + 1);
    expect(validate(valores({ name: largo }), { hasImage: true }).name).toBeDefined();
  });

  it.each([
    ['0', false],
    ['100', false],
    ['-5', false],
    ['abc', false],
    ['', false],
    ['1', true],
    ['50', true],
    ['99', true],
  ])('porcentaje "%s" es válido: %s', (valor, esperado) => {
    const errores = validate(valores({ discount_percentage: valor }), { hasImage: true });
    expect(errores.discount_percentage === undefined).toBe(esperado);
  });

  it(`acepta los límites ${MIN_DISCOUNT} y ${MAX_DISCOUNT}`, () => {
    expect(
      validate(valores({ discount_percentage: String(MIN_DISCOUNT) }), { hasImage: true })
        .discount_percentage,
    ).toBeUndefined();
    expect(
      validate(valores({ discount_percentage: String(MAX_DISCOUNT) }), { hasImage: true })
        .discount_percentage,
    ).toBeUndefined();
  });

  it('exige la posición', () => {
    expect(validate(valores({ position: '' }), { hasImage: true }).position).toBeDefined();
  });

  it('rechaza una posición negativa', () => {
    expect(validate(valores({ position: '-1' }), { hasImage: true }).position).toBeDefined();
  });

  it('exige imagen solo cuando no hay ninguna', () => {
    expect(validate(valores(), { hasImage: false }).image).toBeDefined();
    expect(validate(valores(), { hasImage: true }).image).toBeUndefined();
  });

  it('la descripción es opcional', () => {
    expect(validate(valores(), { hasImage: true }).description).toBeUndefined();
    expect(
      validate(valores({ description: 'Nota breve.' }), { hasImage: true }).description,
    ).toBeUndefined();
  });

  it('rechaza una descripción demasiado larga', () => {
    const larga = 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    expect(validate(valores({ description: larga }), { hasImage: true }).description).toBeDefined();
  });
});

describe('toFormData', () => {
  it('arma el multipart con los campos del formulario', () => {
    const formData = toFormData(valores(), null);

    expect(formData.get('name')).toBe('Banco X');
    expect(formData.get('discount_percentage')).toBe('20');
    expect(formData.get('position')).toBe('0');
    expect(formData.get('is_active')).toBe('true');
    expect(formData.get('image')).toBeNull();
  });

  it('incluye el archivo cuando se eligió uno', () => {
    const archivo = new File(['contenido'], 'logo.png', { type: 'image/png' });
    const formData = toFormData(valores(), archivo);

    expect(formData.get('image')).toBe(archivo);
  });

  it('recorta el nombre antes de enviarlo', () => {
    const formData = toFormData(valores({ name: '  Banco X  ' }), null);

    expect(formData.get('name')).toBe('Banco X');
  });

  it('envía is_active en false cuando el banco está desactivado', () => {
    const formData = toFormData(valores({ is_active: false }), null);

    expect(formData.get('is_active')).toBe('false');
  });

  it('omite la descripción vacía en lugar de mandar una cadena vacía', () => {
    expect(toFormData(valores({ description: '   ' }), null).get('description')).toBeNull();
    expect(toFormData(valores({ description: 'Nota' }), null).get('description')).toBe('Nota');
  });
});
