import { describe, expect, it } from 'vitest';

import { formatGuaranies } from '../../../shared/formatters/currency.js';
import { resolveRevalidation } from '../utils/discrepancies.js';
import { buildInquiry } from './index.js';

/**
 * Flujo completo: respuesta de la API → resolución de discrepancias → mensaje.
 *
 * Cubre la costura entre ambos módulos. Probar cada uno por separado dejaba pasar
 * la pérdida de marca y talle, que sólo existen en el snapshot local.
 */

const localItems = [
  {
    variant_id: 1,
    quantity: 2,
    snapshot: {
      slug: 'botin-nike-mercurial',
      name: 'Botín Nike Mercurial',
      brand: 'Nike',
      size: '42',
      list_price: 650000,
      sale_price: 585000,
      availability: 'available',
    },
  },
];

// Respuesta real de POST /api/v1/cart/revalidate.
const serverItems = [
  {
    variant_id: 1,
    status: 'ok',
    product: {
      slug: 'botin-nike-mercurial',
      name: 'Botín Nike Mercurial',
      thumbnail_url: '/uploads/products/botin-nike-mercurial-1.webp',
    },
    list_price: 650000,
    sale_price: 585000,
    discount_percentage: 10,
    availability: 'available',
    quantity: 2,
  },
];

const templates = {};

describe('de la revalidación al mensaje', () => {
  it('conserva nombre, marca y talle en el mensaje', () => {
    const resolved = resolveRevalidation(localItems, serverItems);
    const inquiry = buildInquiry({
      items: resolved.items,
      templates,
      storeName: 'Pablito Sports',
      whatsappNumber: '+595981123456',
    });

    expect(inquiry.ok).toBe(true);
    expect(inquiry.text).toContain('Botín Nike Mercurial');
    expect(inquiry.text).toContain('Marca: Nike');
    expect(inquiry.text).toContain('Talle: 42');
  });

  it('usa el precio recién revalidado, no el del snapshot', () => {
    const resolved = resolveRevalidation(localItems, [{ ...serverItems[0], sale_price: 500000 }]);
    const inquiry = buildInquiry({
      items: resolved.items,
      templates,
      storeName: 'Pablito Sports',
      whatsappNumber: '+595981123456',
    });

    // 02_ARQUITECTURA.md §13.7: el total usa el precio recién revalidado.
    // El formateador usa espacios especiales, así que se compara contra su salida.
    expect(inquiry.total).toBe(1000000);
    expect(inquiry.text).toContain(formatGuaranies(500000));
  });

  it('omite la etiqueta Talle cuando la variante no tiene talle', () => {
    const withoutSize = [{ ...localItems[0], snapshot: { ...localItems[0].snapshot, size: null } }];
    const resolved = resolveRevalidation(withoutSize, serverItems);
    const inquiry = buildInquiry({
      items: resolved.items,
      templates,
      storeName: 'Pablito Sports',
      whatsappNumber: '+595981123456',
    });

    expect(inquiry.text).not.toContain('Talle:');
    expect(inquiry.text).toContain('Marca: Nike');
  });
});
