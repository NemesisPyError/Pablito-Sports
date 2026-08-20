import { describe, expect, it } from 'vitest';

import { buildMetricCards, describeMissing } from './useDashboard.js';

const TOTALS = {
  total: 12,
  active: 9,
  hidden: 3,
  available: 7,
  low_stock: 2,
  out_of_stock: 3,
  on_sale: 4,
};

describe('buildMetricCards', () => {
  it('produce exactamente las siete métricas de RF-38 (v1.4.0, sin coming_soon)', () => {
    const tarjetas = buildMetricCards(TOTALS);

    expect(tarjetas).toHaveLength(7);
    expect(tarjetas.map((t) => t.key)).toEqual([
      'total',
      'active',
      'hidden',
      'on_sale',
      'available',
      'low_stock',
      'out_of_stock',
    ]);
  });

  it('toma los valores del DTO sin recalcularlos', () => {
    const porClave = Object.fromEntries(buildMetricCards(TOTALS).map((t) => [t.key, t.value]));

    expect(porClave).toEqual(TOTALS);
  });

  it('no inventa métricas fuera del contrato de §10.8', () => {
    const claves = buildMetricCards(TOTALS).map((t) => t.key);

    // Toda clave mostrada debe existir en `totals`.
    claves.forEach((clave) => expect(TOTALS).toHaveProperty(clave));
  });

  it('devuelve una lista vacía mientras no hay datos', () => {
    expect(buildMetricCards(undefined)).toEqual([]);
    expect(buildMetricCards(null)).toEqual([]);
  });

  it('muestra el cero como cero, no como vacío', () => {
    const tarjetas = buildMetricCards({ ...TOTALS, low_stock: 0 });
    const pocoStock = tarjetas.find((t) => t.key === 'low_stock');

    expect(pocoStock.value).toBe(0);
  });
});

describe('describeMissing', () => {
  it('traduce los tres códigos de RF-39', () => {
    expect(describeMissing(['image', 'price', 'category'])).toEqual([
      'Sin imagen',
      'Sin precio',
      'Sin categoría',
    ]);
  });

  it('conserva el orden en que llegan', () => {
    expect(describeMissing(['category', 'image'])).toEqual(['Sin categoría', 'Sin imagen']);
  });

  it('muestra un código desconocido en vez de ocultarlo', () => {
    // Si el contrato creciera, la pantalla lo delata en lugar de perderlo.
    expect(describeMissing(['brand'])).toEqual(['brand']);
  });

  it('tolera la ausencia de la lista', () => {
    expect(describeMissing(undefined)).toEqual([]);
    expect(describeMissing(null)).toEqual([]);
  });
});
