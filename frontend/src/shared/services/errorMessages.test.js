import { describe, expect, it } from 'vitest';

import {
  describeApiError,
  isNetworkFailure,
  isRateLimit,
  RATE_LIMIT_MESSAGE,
} from './errorMessages.js';

describe('isRateLimit', () => {
  it('reconoce el 429', () => {
    expect(isRateLimit({ status: 429 })).toBe(true);
    expect(isRateLimit({ status: 500 })).toBe(false);
    expect(isRateLimit(null)).toBe(false);
  });
});

describe('isNetworkFailure', () => {
  it('reconoce el fallo de red', () => {
    expect(isNetworkFailure({ isNetworkFailure: true })).toBe(true);
    expect(isNetworkFailure({ status: 500 })).toBe(false);
  });
});

describe('describeApiError', () => {
  it('el 429 siempre muestra el mensaje de límite de tasa, sin tecnicismos', () => {
    expect(describeApiError({ status: 429 })).toBe(RATE_LIMIT_MESSAGE);
    expect(RATE_LIMIT_MESSAGE).not.toMatch(/429|rate|limit/i);
  });

  it('el fallo de red gana sobre el status', () => {
    expect(describeApiError({ status: 429, isNetworkFailure: true })).toBe(
      'No pudimos conectar con el servidor.',
    );
  });

  it('traduce 401 / 403 / 5xx sin exponer nada del servidor', () => {
    expect(describeApiError({ status: 401 })).toMatch(/sesión/i);
    expect(describeApiError({ status: 403 })).toMatch(/permiso/i);
    expect(describeApiError({ status: 500 })).toMatch(/servidor/i);
    expect(describeApiError({ status: 502 })).toMatch(/servidor/i);
  });

  it('404 usa el texto específico si se pasa', () => {
    expect(describeApiError({ status: 404 }, { notFound: 'La promoción ya no existe.' })).toBe(
      'La promoción ya no existe.',
    );
    expect(describeApiError({ status: 404 })).toMatch(/no encontramos/i);
  });

  it('cae al fallback ante un status desconocido o sin error', () => {
    expect(describeApiError({ status: 418 }, { fallback: 'Algo salió mal.' })).toBe(
      'Algo salió mal.',
    );
    expect(describeApiError(null, { fallback: 'Algo salió mal.' })).toBe('Algo salió mal.');
  });

  it('nunca devuelve el message crudo del error', () => {
    const error = { status: 500, message: 'internal_server_error' };
    expect(describeApiError(error)).not.toBe(error.message);
  });
});
