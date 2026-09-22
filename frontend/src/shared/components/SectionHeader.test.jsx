import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { SectionHeader } from './SectionHeader.jsx';

/**
 * Aviso opcional debajo del título de sección (símbolo + frase).
 *
 * `ProductRail`/`NewArrivalsCarousel` lo usan para avisar, una sola vez por
 * carril, que las fotos de sus productos cambian al mantener apretado o
 * pasar el cursor — reemplaza al aviso que antes vivía repetido en cada
 * `ProductCard`. `SectionHeader` no decide el texto ni cuándo mostrarlo,
 * solo lo pinta si le llega por `hint`; por eso estos tests fijan el
 * contrato del encabezado en sí, no la lógica de qué carril lo activa.
 */

const TEXTO_AVISO = 'Mantené apretado o pasá el cursor para cambiar de imagen';

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function montar(props) {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root.render(
      <MemoryRouter>
        <SectionHeader id="seccion" title="Destacados" {...props} />
      </MemoryRouter>,
    );
  });
  return contenedor;
}

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

const aviso = (contenedor) =>
  [...contenedor.querySelectorAll('p')].find((p) => p.textContent === TEXTO_AVISO);

describe('SectionHeader — aviso de cambio de imagen', () => {
  it('sin `hint`, no aparece ningún aviso', () => {
    const contenedor = montar();

    expect(contenedor.textContent).not.toContain(TEXTO_AVISO);
  });

  it('con `hint`, aparece debajo del título', () => {
    const contenedor = montar({ hint: TEXTO_AVISO });

    expect(aviso(contenedor)).not.toBeUndefined();
  });

  it('el texto es exactamente el que llega por `hint`', () => {
    const contenedor = montar({ hint: TEXTO_AVISO });

    expect(aviso(contenedor).textContent).toBe(TEXTO_AVISO);
  });

  it('no es interactivo: ni botón, ni enlace, ni foco propio', () => {
    const contenedor = montar({ hint: TEXTO_AVISO });
    const elemento = aviso(contenedor);

    expect(elemento.tagName).toBe('P');
    expect(elemento.querySelector('a, button')).toBeNull();
    expect(elemento.hasAttribute('onclick')).toBe(false);
    expect(elemento.getAttribute('tabindex')).toBeNull();
  });

  it('conviven con el enlace "Ver todo" sin pisarlo', () => {
    const contenedor = montar({ hint: TEXTO_AVISO, href: '/catalogo' });

    const enlace = [...contenedor.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/catalogo');
    expect(enlace).not.toBeUndefined();
    expect(aviso(contenedor)).not.toBeUndefined();
  });

  it('el título sigue siendo el `h2` con el `id` que referencia `aria-labelledby`', () => {
    const contenedor = montar({ hint: TEXTO_AVISO });

    const h2 = contenedor.querySelector('h2#seccion');
    expect(h2?.textContent).toBe('Destacados');
  });
});
