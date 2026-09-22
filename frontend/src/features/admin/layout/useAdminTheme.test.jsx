import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAdminTheme } from './useAdminTheme.js';

/**
 * Persistencia del tema del panel admin.
 *
 * `localStorage` es el mismo mecanismo que ya usa el carrito
 * (`cartStore.js`, `pablito.cart`): acá se guarda bajo una clave propia
 * (`pablito.admin.theme`) para no interferir con esa persistencia ni con
 * ninguna otra.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'pablito.admin.theme';

let contenedor;
let root;
let ultimoResultado;

function Sonda() {
  ultimoResultado = useAdminTheme();
  return null;
}

function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => root.render(<Sonda />));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('useAdminTheme', () => {
  it('arranca en modo claro cuando no hay preferencia guardada', () => {
    montar();

    expect(ultimoResultado.theme).toBe('light');
  });

  it('cambia a oscuro al alternar', () => {
    montar();

    act(() => ultimoResultado.toggleTheme());

    expect(ultimoResultado.theme).toBe('dark');
  });

  it('alternar dos veces vuelve a claro', () => {
    montar();

    act(() => ultimoResultado.toggleTheme());
    act(() => ultimoResultado.toggleTheme());

    expect(ultimoResultado.theme).toBe('light');
  });

  it('la preferencia queda guardada en localStorage', () => {
    montar();

    act(() => ultimoResultado.toggleTheme());

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('una preferencia guardada previamente se respeta al montar de nuevo', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    montar();

    expect(ultimoResultado.theme).toBe('dark');
  });

  it('un valor inválido en localStorage no rompe el panel: cae a claro', () => {
    window.localStorage.setItem(STORAGE_KEY, 'sepia');

    montar();

    expect(ultimoResultado.theme).toBe('light');
  });
});
