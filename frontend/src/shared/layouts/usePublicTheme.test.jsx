import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePublicTheme } from './usePublicTheme.js';

/**
 * Persistencia del tema de la tienda pública. Misma forma que
 * `useAdminTheme.test.jsx`, con clave propia (`pablito.store.theme`).
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'pablito.store.theme';

let contenedor;
let root;
let ultimoResultado;

function Sonda() {
  ultimoResultado = usePublicTheme();
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

describe('usePublicTheme', () => {
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

  it('la preferencia queda guardada en localStorage bajo su propia clave', () => {
    montar();

    act(() => ultimoResultado.toggleTheme());

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('una preferencia guardada previamente se respeta al montar de nuevo', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    montar();

    expect(ultimoResultado.theme).toBe('dark');
  });

  it('un valor inválido en localStorage no rompe la tienda: cae a claro', () => {
    window.localStorage.setItem(STORAGE_KEY, 'sepia');

    montar();

    expect(ultimoResultado.theme).toBe('light');
  });
});
