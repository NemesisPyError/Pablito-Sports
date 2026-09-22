import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FiltersPanel } from './FiltersPanel.jsx';

/**
 * El filtro de `gender` se muestra al cliente como «Género» (antes «Sexo»):
 * el valor y el parámetro de la API no cambian, solo la etiqueta visible.
 */
const FILTROS = {
  q: '',
  sort: 'relevance',
  gender: '',
  category: '',
  brand: '',
  size: '',
  on_sale: false,
  is_new: false,
  is_featured: false,
};

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar() {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root.render(
      <FiltersPanel
        filters={FILTROS}
        facets={{}}
        sortOptions={[{ value: 'relevance', label: 'Relevancia' }]}
        genderSections={[{ label: null, options: [{ value: 'men', label: 'Hombre' }] }]}
        categories={[]}
        brands={[]}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );
  });
  return contenedor;
}

describe('FiltersPanel — etiqueta del filtro de género', () => {
  it('muestra «Género», no «Sexo»', () => {
    const panel = montar();

    expect(panel.textContent).toContain('Género');
    expect(panel.textContent).not.toContain('Sexo');
    expect(panel.querySelector('select[aria-label="Filtrar por género"]')).not.toBeNull();
  });
});
