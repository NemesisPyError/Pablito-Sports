import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CartPage } from './CartPage.jsx';

/**
 * Carrito vacío: la pantalla no puede quedar en un callejón sin salida.
 *
 * Se simulan los hooks del carrito para no depender de red ni del store: lo
 * que se fija es qué ve la persona cuando no agregó nada.
 * `createRoot` + `act`, como el resto del proyecto.
 */

vi.mock('../hooks/useCart.js', () => ({
  useCart: () => ({ items: [], total: 0, discardIfStale: vi.fn() }),
}));
vi.mock('../hooks/useCartRevalidation.js', () => ({
  REVALIDATION_STATE: { IDLE: 'idle', LOADING: 'loading', VERIFIED: 'verified', UNVERIFIED: 'unverified' },
  useCartRevalidation: () => ({ state: 'idle', result: null, revalidate: vi.fn(), reset: vi.fn() }),
}));
vi.mock('../hooks/useCartSync.js', () => ({ useCartSync: () => {} }));
vi.mock('../../store/index.js', () => ({ usePublicWhatsAppTemplate: () => ({ data: null }) }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor;
let raiz;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

function montar() {
  act(() =>
    raiz.render(
      <MemoryRouter initialEntries={['/carrito']}>
        <Routes>
          <Route path="/carrito" element={<CartPage storeSettings={{ store_name: 'Pablito Sports' }} />} />
          <Route path="/catalogo" element={<p>pantalla del catálogo</p>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

describe('CartPage vacío', () => {
  it('dice que el carrito está vacío y lo anuncia como región de estado', () => {
    montar();

    expect(contenedor.textContent).toContain('Tu carrito está vacío');
    expect(contenedor.querySelector('[role="status"]')).not.toBeNull();
  });

  it('ofrece volver al catálogo', () => {
    montar();

    const boton = [...contenedor.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Ver catálogo'),
    );
    expect(boton).toBeDefined();

    act(() => boton.click());

    expect(contenedor.textContent).toContain('pantalla del catálogo');
  });

  it('no muestra el botón de consultar por WhatsApp', () => {
    montar();

    expect(contenedor.textContent).not.toContain('Consultar por WhatsApp');
  });
});
