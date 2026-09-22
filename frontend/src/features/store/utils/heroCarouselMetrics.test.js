import { describe, expect, it } from 'vitest';

import { shouldAutoplay, wrapIndex } from './heroCarouselMetrics.js';

describe('wrapIndex', () => {
  it('deja un índice ya válido sin cambios', () => {
    expect(wrapIndex(1, 3)).toBe(1);
  });

  it('envuelve hacia el final desde un índice negativo', () => {
    expect(wrapIndex(-1, 3)).toBe(2);
  });

  it('envuelve hacia el inicio desde un índice que excede el total', () => {
    expect(wrapIndex(3, 3)).toBe(0);
  });

  it('no revienta con cero piezas', () => {
    expect(wrapIndex(0, 0)).toBe(0);
  });
});

describe('shouldAutoplay', () => {
  it('no avanza con una sola pieza', () => {
    expect(shouldAutoplay({ count: 1, isPaused: false, prefersReducedMotion: false })).toBe(false);
  });

  it('no avanza sin piezas', () => {
    expect(shouldAutoplay({ count: 0, isPaused: false, prefersReducedMotion: false })).toBe(false);
  });

  it('no avanza mientras el usuario interactúa', () => {
    expect(shouldAutoplay({ count: 3, isPaused: true, prefersReducedMotion: false })).toBe(false);
  });

  it('no avanza si se prefiere menos movimiento', () => {
    expect(shouldAutoplay({ count: 3, isPaused: false, prefersReducedMotion: true })).toBe(false);
  });

  it('avanza con varias piezas, sin interacción y sin preferencia de menos movimiento', () => {
    expect(shouldAutoplay({ count: 3, isPaused: false, prefersReducedMotion: false })).toBe(true);
  });
});
