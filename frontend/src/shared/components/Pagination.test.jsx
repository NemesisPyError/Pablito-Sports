import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination.jsx';

/**
 * Con cientos o miles de productos el catálogo puede tener decenas de
 * páginas: `Pagination` no debe dibujar un botón por cada una (eso sí sería
 * "todo desplegado de golpe"), solo una ventana alrededor de la página
 * actual, más "Anterior"/"Siguiente" y el total en texto.
 */

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar(props) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root.render(<Pagination {...props} />);
  });
  return contenedor;
}

const botonesDePagina = (contenedor) =>
  [...contenedor.querySelectorAll('.page-item .page-link')]
    .map((el) => el.textContent)
    .filter((texto) => /^\d+$/.test(texto));

describe('Pagination — muchos resultados', () => {
  it('con cientos de páginas solo dibuja una ventana chica alrededor de la actual', () => {
    const panel = montar({ page: 50, totalPages: 300, total: 6000, onPageChange: vi.fn() });

    expect(botonesDePagina(panel)).toEqual(['49', '50', '51']);
  });

  it('muestra el total de resultados en texto, no la lista entera', () => {
    const panel = montar({ page: 1, totalPages: 300, total: 6000, onPageChange: vi.fn() });

    expect(panel.textContent).toContain('6000 resultados');
  });

  it('no se renderiza con una sola página (pocos resultados)', () => {
    const panel = montar({ page: 1, totalPages: 1, total: 4, onPageChange: vi.fn() });

    expect(panel.querySelector('nav')).toBeNull();
  });

  it('"Anterior" está deshabilitado en la primera página', () => {
    const panel = montar({ page: 1, totalPages: 10, total: 200, onPageChange: vi.fn() });

    expect(panel.querySelector('[aria-label="Página anterior"]').disabled).toBe(true);
  });

  it('"Siguiente" está deshabilitado en la última página', () => {
    const panel = montar({ page: 10, totalPages: 10, total: 200, onPageChange: vi.fn() });

    expect(panel.querySelector('[aria-label="Página siguiente"]').disabled).toBe(true);
  });

  it('pedir una página dispara el cambio con ese número', () => {
    const onPageChange = vi.fn();
    const panel = montar({ page: 5, totalPages: 20, total: 400, onPageChange });

    act(() => {
      panel.querySelector('[aria-label="Página siguiente"]').click();
    });

    expect(onPageChange).toHaveBeenCalledWith(6);
  });
});
