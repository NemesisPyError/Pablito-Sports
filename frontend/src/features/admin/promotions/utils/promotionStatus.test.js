import { describe, expect, it } from 'vitest';

import { getPromotionStatus, PROMOTION_STATUS } from './promotionStatus.js';

// Reloj fijo: el estado depende del valor declarado, no de cuándo se ejecute.
const AHORA = new Date('2026-06-15T12:00:00Z');
const AYER = '2026-06-14T12:00:00Z';
const MANANA = '2026-06-16T12:00:00Z';

function promo(overrides) {
  return { is_active: true, starts_at: AYER, ends_at: MANANA, ...overrides };
}

describe('getPromotionStatus', () => {
  it('marca vigente la que está dentro de su ventana', () => {
    expect(getPromotionStatus(promo(), AHORA)).toBe(PROMOTION_STATUS.ACTIVE);
  });

  it('marca programada la que todavía no empezó', () => {
    const futura = promo({ starts_at: MANANA, ends_at: '2026-06-20T12:00:00Z' });

    expect(getPromotionStatus(futura, AHORA)).toBe(PROMOTION_STATUS.SCHEDULED);
  });

  it('marca expirada la que ya terminó (RN-32)', () => {
    const vencida = promo({ starts_at: '2026-06-01T12:00:00Z', ends_at: AYER });

    expect(getPromotionStatus(vencida, AHORA)).toBe(PROMOTION_STATUS.EXPIRED);
  });

  it('sin fecha de fin sigue vigente indefinidamente (RN-33)', () => {
    expect(getPromotionStatus(promo({ ends_at: null }), AHORA)).toBe(PROMOTION_STATUS.ACTIVE);
  });

  it('la bandera inactiva manda sobre las fechas', () => {
    // Aunque esté dentro de su ventana, el administrador la apagó.
    expect(getPromotionStatus(promo({ is_active: false }), AHORA)).toBe(PROMOTION_STATUS.INACTIVE);
  });

  it('una inactiva y además vencida se muestra como inactiva', () => {
    const ambas = promo({ is_active: false, ends_at: AYER });

    expect(getPromotionStatus(ambas, AHORA)).toBe(PROMOTION_STATUS.INACTIVE);
  });

  it('el instante exacto de fin ya cuenta como expirada', () => {
    // El backend evalúa `ends_at > moment`: al llegar el fin, deja de aplicar.
    const justoAlFinal = promo({ ends_at: AHORA.toISOString() });

    expect(getPromotionStatus(justoAlFinal, AHORA)).toBe(PROMOTION_STATUS.EXPIRED);
  });

  it('el instante exacto de inicio ya cuenta como vigente', () => {
    const justoAlInicio = promo({ starts_at: AHORA.toISOString() });

    expect(getPromotionStatus(justoAlInicio, AHORA)).toBe(PROMOTION_STATUS.ACTIVE);
  });
});
