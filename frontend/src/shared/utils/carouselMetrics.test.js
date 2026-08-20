import { describe, expect, it } from 'vitest';

import {
  computeScrollState,
  hasOverflow,
  scrollBehavior,
  scrollStep,
  SCROLL_TOLERANCE,
} from './carouselMetrics.js';

describe('hasOverflow', () => {
  it('detecta desbordamiento cuando el contenido excede el ancho visible', () => {
    expect(hasOverflow({ scrollWidth: 1200, clientWidth: 800 })).toBe(true);
  });

  it('no detecta desbordamiento cuando el contenido entra completo', () => {
    expect(hasOverflow({ scrollWidth: 800, clientWidth: 800 })).toBe(false);
  });

  it('ignora diferencias dentro de la tolerancia', () => {
    expect(hasOverflow({ scrollWidth: 800 + SCROLL_TOLERANCE, clientWidth: 800 })).toBe(false);
  });

  it('sin medidas asume que no hay desbordamiento', () => {
    expect(hasOverflow()).toBe(false);
  });
});

describe('computeScrollState', () => {
  const rail = { scrollWidth: 2000, clientWidth: 800 };

  it('al inicio solo permite avanzar', () => {
    expect(computeScrollState({ ...rail, scrollLeft: 0 })).toEqual({
      overflowing: true,
      canScrollPrevious: false,
      canScrollNext: true,
    });
  });

  it('en el medio permite ambas direcciones', () => {
    expect(computeScrollState({ ...rail, scrollLeft: 600 })).toEqual({
      overflowing: true,
      canScrollPrevious: true,
      canScrollNext: true,
    });
  });

  it('al final solo permite retroceder', () => {
    expect(computeScrollState({ ...rail, scrollLeft: 1200 })).toEqual({
      overflowing: true,
      canScrollPrevious: true,
      canScrollNext: false,
    });
  });

  it('sin desbordamiento no habilita ninguna dirección', () => {
    expect(computeScrollState({ scrollWidth: 800, clientWidth: 800, scrollLeft: 0 })).toEqual({
      overflowing: false,
      canScrollPrevious: false,
      canScrollNext: false,
    });
  });

  it('trata el desplazamiento negativo de derecha a izquierda por valor absoluto', () => {
    expect(computeScrollState({ ...rail, scrollLeft: -600 })).toEqual({
      overflowing: true,
      canScrollPrevious: true,
      canScrollNext: true,
    });
  });

  it('no deja el botón siguiente habilitado por una fracción de píxel', () => {
    const state = computeScrollState({ ...rail, scrollLeft: 1200 - SCROLL_TOLERANCE / 2 });
    expect(state.canScrollNext).toBe(false);
  });
});

describe('scrollStep', () => {
  it('avanza una pantalla completa', () => {
    expect(scrollStep({ clientWidth: 800, direction: 'next' })).toBe(800);
  });

  it('retrocede una pantalla completa', () => {
    expect(scrollStep({ clientWidth: 800, direction: 'previous' })).toBe(-800);
  });

  it('avanza por defecto', () => {
    expect(scrollStep({ clientWidth: 500 })).toBe(500);
  });
});

describe('scrollBehavior', () => {
  it('es instantáneo cuando se pide movimiento reducido', () => {
    expect(scrollBehavior(true)).toBe('auto');
  });

  it('es suave en condiciones normales', () => {
    expect(scrollBehavior(false)).toBe('smooth');
  });
});
