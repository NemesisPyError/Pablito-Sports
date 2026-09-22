import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrollToTop } from './ScrollToTop.jsx';

/**
 * Entrar a una página nueva empieza arriba; volver, no.
 *
 * El fallo era visible: bajar dentro de una ficha de producto, salir, entrar a
 * otra y aparecer a media página. React Router cambia el árbol pero no toca el
 * scroll, y para el navegador una navegación de cliente no es una navegación,
 * así que no restaura nada.
 *
 * Lo que estos tests protegen, más que el salto en sí, son las dos excepciones
 * —lo que sería fácil romper después:
 *
 *   · `POP` (atrás/adelante) NO salta: volver al catálogo debe reaparecer donde
 *     estabas. Eso lo restaura el navegador y aquí sólo hay que no estorbarlo.
 *   · cambiar el query string SIN cambiar de ruta no salta: filtrar y paginar
 *     el catálogo no son páginas nuevas.
 */

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor;
let raiz;
let scrolls;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
  scrolls = [];
  // jsdom no implementa `scrollTo`; se registra cada llamada.
  vi.stubGlobal(
    'scrollTo',
    vi.fn((opciones) => scrolls.push(opciones)),
  );
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.unstubAllGlobals();
});

/** Botones que provocan cada tipo de navegación desde dentro del router. */
function Controles() {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/producto/b">a otro producto</Link>
      <button type="button" onClick={() => navigate('/catalogo?page=2')}>
        filtrar
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        atrás
      </button>
    </>
  );
}

function montar(entradas = ['/producto/a']) {
  act(() =>
    raiz.render(
      <MemoryRouter initialEntries={entradas}>
        <ScrollToTop />
        <Controles />
        <Routes>
          <Route path="*" element={<span>contenido</span>} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

const pulsar = (texto) => {
  const control = [...contenedor.querySelectorAll('a, button')].find(
    (elemento) => elemento.textContent === texto,
  );
  act(() => control.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
};

describe('una página nueva empieza arriba', () => {
  it('ir de un producto a otro sube al tope', () => {
    montar();
    scrolls = [];

    pulsar('a otro producto');

    expect(scrolls).toHaveLength(1);
    expect(scrolls[0]).toMatchObject({ top: 0, left: 0 });
  });

  it('el salto es instantáneo, no animado', () => {
    montar();
    scrolls = [];

    pulsar('a otro producto');

    expect(scrolls[0].behavior).toBe('instant');
  });
});

describe('lo que NO debe saltar', () => {
  it('volver atrás conserva la posición', () => {
    montar(['/catalogo', '/producto/a']);
    scrolls = [];

    pulsar('atrás');

    expect(scrolls).toHaveLength(0);
  });

  it('cambiar el query string sin cambiar de ruta no salta', () => {
    montar(['/catalogo']);
    scrolls = [];

    pulsar('filtrar');

    expect(scrolls).toHaveLength(0);
  });

  it('el primer render no fuerza un salto por sí solo', () => {
    // Entrar por URL directa ya llega arriba; lo que importa es que no se
    // repita el salto sin que haya habido navegación.
    montar();
    const trasElMontaje = scrolls.length;

    act(() => {});

    expect(scrolls.length).toBe(trasElMontaje);
  });
});

describe('la secuencia que reportó el fallo', () => {
  it('bajar en un producto, volver y entrar a otro termina arriba', () => {
    // El recorrido tal cual se describió: catálogo → producto A → volver →
    // producto B. Sólo el último paso debe subir al tope.
    montar(['/catalogo', '/producto/a']);
    scrolls = [];

    pulsar('atrás'); // POP a /catalogo: el navegador restaura, no saltamos
    expect(scrolls).toHaveLength(0);

    pulsar('a otro producto'); // PUSH a /producto/b: página nueva
    expect(scrolls).toHaveLength(1);
    expect(scrolls[0]).toMatchObject({ top: 0 });
  });
});

describe('no renderiza nada', () => {
  it('no aporta marcado al documento', () => {
    act(() =>
      raiz.render(
        <MemoryRouter>
          <ScrollToTop />
        </MemoryRouter>,
      ),
    );

    expect(contenedor.innerHTML).toBe('');
  });
});
