import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SearchForm } from './PublicNavbar.jsx';

/**
 * La lupa siempre lleva a algún lado.
 *
 * Antes se deshabilitaba con el campo vacío: el razonamiento era que navegar a
 * `q=` vacío no es una búsqueda, y es cierto. Pero el efecto en pantalla era un
 * control muerto justo para quien más lo necesita —el que pulsa la lupa porque
 * todavía no sabe qué escribir y espera llegar al buscador—.
 *
 * El contrato queda así, y estos tests lo fijan:
 *
 *   · con término  → `/catalogo?q=<término>`
 *   · vacío        → `/catalogo`, sin `q`
 *
 * Lo segundo importa que sea SIN `q`: un `q=` vacío en la URL haría que
 * `useCatalogFilters` arrancara con un filtro de texto puesto.
 */

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

/** Deja a la vista la URL a la que se navegó. */
function Destino() {
  const { pathname, search } = useLocation();
  return <span data-testid="destino">{pathname + search}</span>;
}

function montar() {
  act(() =>
    raiz.render(
      <MemoryRouter initialEntries={['/']}>
        <SearchForm />
        <Routes>
          <Route path="*" element={<Destino />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

const campo = () => contenedor.querySelector('input[type="search"]');
const lupa = () => contenedor.querySelector('button[type="submit"]');
const destino = () => contenedor.querySelector('[data-testid="destino"]').textContent;

function escribir(texto) {
  const input = campo();
  act(() => {
    // React intercepta el setter nativo: hay que llamarlo directo para que el
    // evento que sigue traiga el valor nuevo.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, texto);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function pulsarLupa() {
  act(() => lupa().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
}

describe('la lupa con el campo vacío', () => {
  it('está habilitada', () => {
    montar();

    expect(lupa().disabled).toBe(false);
  });

  it('lleva al catálogo, que es donde están la búsqueda y los filtros', () => {
    montar();
    pulsarLupa();

    expect(destino()).toBe('/catalogo');
  });

  it('no arrastra un `q` vacío en la URL', () => {
    montar();
    pulsarLupa();

    expect(destino()).not.toContain('q=');
  });

  it('el campo con sólo espacios cuenta como vacío', () => {
    montar();
    escribir('   ');
    pulsarLupa();

    expect(destino()).toBe('/catalogo');
  });
});

describe('la lupa con un término escrito busca, como siempre', () => {
  it('navega al catálogo con el término', () => {
    montar();
    escribir('botines');
    pulsarLupa();

    expect(destino()).toBe('/catalogo?q=botines');
  });

  it('recorta los espacios del término', () => {
    montar();
    escribir('  botines  ');
    pulsarLupa();

    expect(destino()).toBe('/catalogo?q=botines');
  });

  it('codifica lo que haga falta', () => {
    montar();
    escribir('zapatillas & niños');
    pulsarLupa();

    expect(destino()).toBe('/catalogo?q=zapatillas%20%26%20ni%C3%B1os');
  });
});

describe('Enter y la lupa son el mismo camino', () => {
  it('enviar el formulario con el campo vacío también lleva al catálogo', () => {
    montar();
    act(() =>
      contenedor
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );

    expect(destino()).toBe('/catalogo');
  });
});

describe('el cierre de la búsqueda móvil', () => {
  it('se avisa con el campo vacío igual que con término', () => {
    const alEnviar = vi.fn();
    act(() =>
      raiz.render(
        <MemoryRouter initialEntries={['/']}>
          <SearchForm onSubmitted={alEnviar} />
        </MemoryRouter>,
      ),
    );
    pulsarLupa();

    expect(alEnviar).toHaveBeenCalledTimes(1);
  });
});
