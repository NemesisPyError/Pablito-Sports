import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PublicFooter } from './PublicFooter.jsx';

/**
 * Superdescuentos en el pie: desde que la sección deja de estar hardcodeada
 * (`BANK_PROMOTIONS`) y pasa a consumir `useBanks` (bancos administrados
 * desde el panel), lo que importa fijar es que la sección refleje lo que
 * devuelve la API — incluida su ausencia — y no un dato fijo en el código.
 */

const { useBanksMock } = vi.hoisted(() => ({ useBanksMock: vi.fn() }));

vi.mock('../../features/store/hooks/useBanks.js', () => ({
  useBanks: useBanksMock,
}));

let contenedor;
let raiz;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  useBanksMock.mockReset();
});

function montar(storeSettings = {}) {
  act(() => {
    raiz.render(
      <MemoryRouter>
        <PublicFooter storeSettings={storeSettings} />
      </MemoryRouter>,
    );
  });
}

describe('PublicFooter — Superdescuentos', () => {
  it('no muestra la sección si no hay bancos activos', () => {
    useBanksMock.mockReturnValue({ data: [] });
    montar();

    expect(contenedor.textContent).not.toContain('SUPER');
  });

  it('no muestra la sección mientras los bancos todavía no llegaron', () => {
    useBanksMock.mockReturnValue({ data: undefined });
    montar();

    expect(contenedor.textContent).not.toContain('SUPER');
  });

  it('muestra cada banco con su nombre y porcentaje', () => {
    useBanksMock.mockReturnValue({
      data: [
        { name: 'Banco X', discount_percentage: 20, image_url: '/uploads/banks/x-800.webp' },
        { name: 'Banco Y', discount_percentage: 35, image_url: null },
      ],
    });
    montar();

    expect(contenedor.textContent).toContain('SUPER');
    expect(contenedor.textContent).toContain('Banco X');
    expect(contenedor.textContent).toContain('20%');
    expect(contenedor.textContent).toContain('Banco Y');
    expect(contenedor.textContent).toContain('35%');
  });

  it('un banco sin mini banner no rompe el listado ni muestra una imagen rota', () => {
    useBanksMock.mockReturnValue({
      data: [{ name: 'Banco Sin Logo', discount_percentage: 10, image_url: null }],
    });
    montar();

    expect(contenedor.querySelector('img[alt="Banco Sin Logo"]')).toBeNull();
    expect(contenedor.textContent).toContain('Banco Sin Logo');
  });

  it('un banco con mini banner muestra la imagen', () => {
    useBanksMock.mockReturnValue({
      data: [{ name: 'Banco Con Logo', discount_percentage: 15, image_url: '/uploads/banks/y-800.webp' }],
    });
    montar();

    const img = contenedor.querySelector('img[alt="Banco Con Logo"]');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe('/uploads/banks/y-800.webp');
  });
});
