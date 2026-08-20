import { describe, expect, it } from 'vitest';

import { formatDate, formatDateTime } from './date.js';

describe('formatDateTime', () => {
  it('devuelve una cadena vacía cuando no hay valor', () => {
    // Un guion o un "Invalid Date" en pantalla es peor que no mostrar nada.
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime('')).toBe('');
  });

  it('devuelve una cadena vacía ante una fecha imposible de interpretar', () => {
    expect(formatDateTime('el martes')).toBe('');
  });

  it('formatea una marca ISO con fecha y hora', () => {
    const resultado = formatDateTime('2026-06-15T12:30:00+00:00');

    expect(resultado).not.toBe('');
    expect(resultado).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(resultado).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatDate', () => {
  it('omite la hora', () => {
    const resultado = formatDate('2026-06-15T12:30:00+00:00');

    expect(resultado).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('devuelve una cadena vacía sin valor', () => {
    expect(formatDate(null)).toBe('');
  });
});
