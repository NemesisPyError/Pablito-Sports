import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AdminLoadingScreen } from './AdminLoadingScreen.jsx';

/**
 * Reemplazo de "Cargando panel" (spinner de Bootstrap sobre blanco) como
 * `fallback` del `Suspense` que envuelve `AdminRoutes` en `App.jsx`.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor;
let root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => root.render(<AdminLoadingScreen />));
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('AdminLoadingScreen', () => {
  it('anuncia la carga de forma accesible', () => {
    const estado = contenedor.querySelector('[role="status"]');

    expect(estado).not.toBeNull();
    expect(estado.getAttribute('aria-live')).toBe('polite');
    expect(contenedor.textContent).toContain('Cargando panel');
  });

  it('mantiene la identidad tipográfica de Pablito Sports', () => {
    expect(contenedor.textContent).toContain('PablitoSports');
  });

  it('el indicador de carga es puramente decorativo para lectores de pantalla', () => {
    const indicador = contenedor.querySelector('[aria-hidden="true"]');

    expect(indicador).not.toBeNull();
  });
});
