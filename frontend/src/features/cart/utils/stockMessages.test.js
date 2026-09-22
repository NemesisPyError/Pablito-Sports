import { describe, expect, it } from 'vitest';

import { CART_ERRORS } from '../stores/cartStore.js';
import { mensajeDeRechazo, mensajeDeRevalidacion } from './stockMessages.js';

describe('mensajeDeRechazo', () => {
  it('dice cuántas unidades quedan y nombra el talle', () => {
    const texto = mensajeDeRechazo(
      { error: CART_ERRORS.INSUFFICIENT_STOCK, available: 3 },
      '41',
    );

    expect(texto).toBe('No hay suficiente stock para el talle 41. Disponible: 3 unidades.');
  });

  it('singulariza una sola unidad', () => {
    const texto = mensajeDeRechazo({ error: CART_ERRORS.INSUFFICIENT_STOCK, available: 1 }, '41');

    expect(texto).toContain('Disponible: 1 unidad.');
  });

  it('con stock 0 invita a consultar en vez de cerrar la puerta (RN-40)', () => {
    const texto = mensajeDeRechazo({ error: CART_ERRORS.INSUFFICIENT_STOCK, available: 0 }, '41');

    expect(texto).toContain('consultarnos');
  });

  it('no inventa un número cuando el backend no lo publica', () => {
    const texto = mensajeDeRechazo({ error: CART_ERRORS.INSUFFICIENT_STOCK, available: null }, '41');

    expect(texto).toBe('No hay suficiente stock para el talle 41.');
    expect(texto).not.toMatch(/\d+ unidad/);
  });

  it('funciona sin conocer el talle', () => {
    expect(mensajeDeRechazo({ error: CART_ERRORS.INSUFFICIENT_STOCK, available: 2 })).toContain(
      'este talle',
    );
  });

  it('mantiene el mensaje del límite de productos distintos', () => {
    expect(mensajeDeRechazo({ error: CART_ERRORS.TOO_MANY_ITEMS, limit: 26 })).toContain('26');
  });

  it('nunca filtra el código técnico al cliente', () => {
    for (const error of Object.values(CART_ERRORS)) {
      const texto = mensajeDeRechazo({ error, available: 2, limit: 26 }, '41');
      expect(texto).not.toContain(error);
      expect(texto).not.toContain('_');
    }
  });

  it('tiene una frase para un motivo desconocido, en vez de romperse', () => {
    expect(mensajeDeRechazo({ error: 'algo_que_no_existe' })).toBeTruthy();
    expect(mensajeDeRechazo(undefined)).toBeTruthy();
  });
});

describe('mensajeDeRevalidacion', () => {
  it('explica que se agotó mientras estaba en el carrito', () => {
    expect(mensajeDeRevalidacion(0)).toContain('Se agotó');
  });

  it('dice cuántas quedan cuando el servidor recorta', () => {
    expect(mensajeDeRevalidacion(2)).toContain('2 unidades');
  });
});
