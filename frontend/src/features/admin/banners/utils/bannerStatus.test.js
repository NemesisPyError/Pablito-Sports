import { describe, expect, it } from 'vitest';

import { BANNER_STATUS, describeBannerStatus, getBannerStatus } from './bannerStatus.js';

// Reloj fijo: el estado depende del valor declarado, no de cuándo se ejecute.
const AHORA = new Date('2026-06-15T12:00:00Z');
const AYER = '2026-06-14T12:00:00Z';
const MANANA = '2026-06-16T12:00:00Z';

function banner(overrides) {
  return { is_active: true, starts_at: AYER, ends_at: MANANA, ...overrides };
}

describe('getBannerStatus', () => {
  it('marca vigente el que está dentro de su ventana', () => {
    expect(getBannerStatus(banner(), AHORA)).toBe(BANNER_STATUS.ACTIVE);
  });

  it('marca programado el que todavía no empezó', () => {
    const futuro = banner({ starts_at: MANANA, ends_at: '2026-06-20T12:00:00Z' });

    expect(getBannerStatus(futuro, AHORA)).toBe(BANNER_STATUS.SCHEDULED);
  });

  it('marca expirado el que ya terminó', () => {
    const vencido = banner({ starts_at: '2026-06-01T12:00:00Z', ends_at: AYER });

    expect(getBannerStatus(vencido, AHORA)).toBe(BANNER_STATUS.EXPIRED);
  });

  it('sin fechas es permanente mientras esté activo (RN-74)', () => {
    const permanente = banner({ starts_at: null, ends_at: null });

    expect(getBannerStatus(permanente, AHORA)).toBe(BANNER_STATUS.ACTIVE);
  });

  it('sin fecha de fin sigue vigente indefinidamente (RN-74)', () => {
    expect(getBannerStatus(banner({ ends_at: null }), AHORA)).toBe(BANNER_STATUS.ACTIVE);
  });

  it('sin fecha de inicio ya rige, si no venció', () => {
    expect(getBannerStatus(banner({ starts_at: null }), AHORA)).toBe(BANNER_STATUS.ACTIVE);
  });

  it('la bandera inactiva manda sobre las fechas', () => {
    // Aunque esté dentro de su ventana, el administrador lo apagó.
    expect(getBannerStatus(banner({ is_active: false }), AHORA)).toBe(BANNER_STATUS.INACTIVE);
  });

  it('un inactivo y además vencido se muestra como inactivo', () => {
    const apagado = banner({ is_active: false, ends_at: AYER });

    expect(getBannerStatus(apagado, AHORA)).toBe(BANNER_STATUS.INACTIVE);
  });

  it('el instante exacto del fin ya cuenta como expirado', () => {
    const justo = banner({ ends_at: AHORA.toISOString() });

    expect(getBannerStatus(justo, AHORA)).toBe(BANNER_STATUS.EXPIRED);
  });

  it('trata una fecha ilegible como ausente en vez de inventar una ventana', () => {
    const roto = banner({ starts_at: 'no es una fecha', ends_at: null });

    expect(getBannerStatus(roto, AHORA)).toBe(BANNER_STATUS.ACTIVE);
  });
});

describe('describeBannerStatus', () => {
  it('devuelve la etiqueta y el tono del estado', () => {
    expect(describeBannerStatus(banner(), AHORA)).toEqual({ label: 'Vigente', tone: 'success' });
  });
});
