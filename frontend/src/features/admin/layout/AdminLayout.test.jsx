import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sesion = { administrator: { username: 'admin', role: 'administrator' } };

vi.mock('../../auth/index.js', () => ({
  useAdminAuth: () => sesion,
  useAdminLogout: () => ({ mutate: vi.fn(), isPending: false }),
}));

const { AdminLayout } = await import('./AdminLayout.jsx');

/**
 * El tema oscuro se aplica sobre `.shell` (raíz de `AdminLayout`), nunca en
 * `<html>`/`<body>`: es la garantía estructural de que la tienda pública —que
 * no renderiza este componente— no puede heredar nada de acá. Ver
 * `useAdminTheme.js` y el bloque `.shell[data-theme='dark']` de
 * `tokens.css`.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const STORAGE_KEY = 'pablito.admin.theme';

let contenedor;
let root;

beforeEach(() => {
  window.localStorage.clear();
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar() {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<p>Contenido</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  });
}

const shell = () => contenedor.querySelector('[data-theme]');
const botonTema = () => contenedor.querySelector('[aria-label^="Cambiar a modo"]');

describe('AdminLayout — tema del panel', () => {
  it('arranca en claro y no en ningún otro elemento fuera de `.shell`', () => {
    montar();

    expect(shell().getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
    expect(document.body.getAttribute('data-theme')).toBeNull();
  });

  it('el botón de tema cambia `data-theme` sin recargar la página', () => {
    montar();

    act(() => botonTema().click());

    expect(shell().getAttribute('data-theme')).toBe('dark');
  });

  it('la preferencia persiste en localStorage tras el cambio', () => {
    montar();

    act(() => botonTema().click());

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('una preferencia oscura guardada se aplica al volver a entrar', () => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');

    montar();

    expect(shell().getAttribute('data-theme')).toBe('dark');
  });

  it('el contenido de la pantalla activa se sigue mostrando', () => {
    montar();

    expect(contenedor.textContent).toContain('Contenido');
  });
});
