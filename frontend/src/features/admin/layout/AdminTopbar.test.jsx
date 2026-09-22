import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminTopbar } from './AdminTopbar.jsx';

/**
 * Selector de tema en la topbar.
 *
 * Ubicación: junto al resto del "chrome" del panel (menú, usuario, salir),
 * sin ocupar una sección propia — pedido explícito del usuario de no sumar
 * espacio innecesario.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor;
let root;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar(props) {
  act(() => {
    root.render(
      <MemoryRouter>
        <AdminTopbar
          title="Dashboard"
          administrator={{ username: 'admin' }}
          onToggleSidebar={vi.fn()}
          onLogout={vi.fn()}
          loggingOut={false}
          theme="light"
          onToggleTheme={vi.fn()}
          {...props}
        />
      </MemoryRouter>,
    );
  });
}

describe('AdminTopbar — selector de tema', () => {
  it('en modo claro ofrece pasar a oscuro', () => {
    montar({ theme: 'light' });
    const boton = contenedor.querySelector('[aria-label="Cambiar a modo oscuro"]');

    expect(boton).not.toBeNull();
    expect(boton.getAttribute('aria-pressed')).toBe('false');
  });

  it('en modo oscuro ofrece pasar a claro', () => {
    montar({ theme: 'dark' });
    const boton = contenedor.querySelector('[aria-label="Cambiar a modo claro"]');

    expect(boton).not.toBeNull();
    expect(boton.getAttribute('aria-pressed')).toBe('true');
  });

  it('el clic llama a onToggleTheme', () => {
    const onToggleTheme = vi.fn();
    montar({ theme: 'light', onToggleTheme });

    act(() => {
      contenedor.querySelector('[aria-label="Cambiar a modo oscuro"]').click();
    });

    expect(onToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('no rompe el resto de la topbar (usuario y salir siguen presentes)', () => {
    montar();

    expect(contenedor.textContent).toContain('admin');
    expect(contenedor.textContent).toContain('Salir');
  });
});
