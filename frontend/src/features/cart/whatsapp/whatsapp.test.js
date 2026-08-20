import { describe, expect, it } from 'vitest';

import { DEFAULT_ITEM_TEMPLATE, DEFAULT_MESSAGE_TEMPLATE } from './defaultTemplates.js';
import {
  MESSAGE_HARD_LIMIT,
  MESSAGE_WORKING_LIMIT,
  buildInquiry,
  buildMessage,
  buildWhatsAppLink,
  checkLength,
  generateInquiryCode,
} from './index.js';
import { dropEmptyLabels, missingRequiredVariables, render } from './template.js';

const templates = {
  message_template: DEFAULT_MESSAGE_TEMPLATE,
  item_template: DEFAULT_ITEM_TEMPLATE,
};

function item(index, overrides = {}) {
  return {
    variant_id: index,
    quantity: 1,
    snapshot: {
      name: `Producto ${index}`,
      brand: 'Nike',
      size: '42',
      list_price: 650000,
      sale_price: 585000,
      availability: 'available',
    },
    server: {
      product: { name: `Producto ${index}`, slug: `p-${index}` },
      list_price: 650000,
      sale_price: 585000,
      availability: 'available',
    },
    ...overrides,
  };
}

describe('motor de plantillas (PR-06)', () => {
  it('sustituye variables conocidas', () => {
    expect(render('Hola {{tienda}}', { tienda: 'Pablito' }).text).toBe('Hola Pablito');
  });

  it('deja vacía una variable desconocida y la reporta', () => {
    const result = render('X {{inventada}} Y', {});

    expect(result.text).toBe('X  Y');
    expect(result.unknown).toEqual(['inventada']);
  });

  it('valida las variables obligatorias (RN-60)', () => {
    expect(missingRequiredVariables(DEFAULT_MESSAGE_TEMPLATE)).toEqual([]);
    expect(missingRequiredVariables('Sin nada')).toEqual(['items', 'total']);
  });
});

describe('omisión de etiquetas sin valor (§13.9)', () => {
  it('omite la etiqueta y su valor juntos', () => {
    const line = '   Marca: Nike | Talle: ';

    expect(dropEmptyLabels(line)).toBe('   Marca: Nike');
  });

  it('no imprime la etiqueta Talle cuando el producto no tiene talle', () => {
    const { text } = buildMessage({
      items: [item(1, { snapshot: { ...item(1).snapshot, size: null } })],
      templates,
      storeName: 'Pablito Sports',
      inquiryCode: 'PS-ABCDE',
    });

    expect(text).not.toContain('Talle:');
    expect(text).toContain('Marca: Nike');
  });
});

describe('código de consulta (RN-64)', () => {
  it('usa el formato PS-XXXXX', () => {
    expect(generateInquiryCode()).toMatch(/^PS-[A-Z0-9]{5}$/);
  });
});

describe('presupuesto de longitud (RN-76, DN-17)', () => {
  it('el techo de trabajo es 4000 y el oficial 4096', () => {
    expect(MESSAGE_WORKING_LIMIT).toBe(4000);
    expect(MESSAGE_HARD_LIMIT).toBe(4096);
  });

  it('mide caracteres del cuerpo, no longitud del enlace', () => {
    const text = 'á'.repeat(10);

    expect(checkLength(text).length).toBe(10);
    expect(buildWhatsAppLink('+595981123456', text).length).toBeGreaterThan(10);
  });

  it('un carrito de 26 ítems típicos cabe en el presupuesto', () => {
    // DN-17: 26 es el máximo que el caso típico sostiene.
    const items = Array.from({ length: 26 }, (_, index) => item(index + 1));
    const inquiry = buildInquiry({
      items,
      templates,
      storeName: 'Pablito Sports',
      whatsappNumber: '+595981123456',
    });

    expect(inquiry.ok).toBe(true);
    expect(inquiry.budget.length).toBeLessThanOrEqual(MESSAGE_WORKING_LIMIT);
  });

  it('advierte y no genera el enlace si el cuerpo excede el techo', () => {
    // El peor caso (nombres largos) supera el presupuesto aun con 26 ítems.
    const items = Array.from({ length: 26 }, (_, index) =>
      item(index + 1, {
        snapshot: { ...item(index + 1).snapshot, name: 'P'.repeat(160) },
        server: { ...item(index + 1).server, product: { name: 'P'.repeat(160), slug: 'x' } },
      }),
    );
    const inquiry = buildInquiry({
      items,
      templates,
      storeName: 'Pablito Sports',
      whatsappNumber: '+595981123456',
    });

    expect(inquiry.ok).toBe(false);
    expect(inquiry.reason).toBe('message_too_long');
    expect(inquiry.url).toBeUndefined();
    expect(inquiry.budget.length).toBeGreaterThan(MESSAGE_WORKING_LIMIT);
  });
});

describe('enlace wa.me (RN-62)', () => {
  it('codifica el mensaje y normaliza el número', () => {
    const url = buildWhatsAppLink('+595 981 123-456', 'Hola & chau');

    expect(url).toBe('https://wa.me/595981123456?text=Hola%20%26%20chau');
  });

  it('usa el precio vigente para el total', () => {
    const inquiry = buildInquiry({
      items: [item(1, { quantity: 2 })],
      templates,
      storeName: 'Pablito Sports',
      whatsappNumber: '+595981123456',
    });

    expect(inquiry.total).toBe(1170000);
    expect(inquiry.text).toContain('Consulta N.º: PS-');
  });
});
