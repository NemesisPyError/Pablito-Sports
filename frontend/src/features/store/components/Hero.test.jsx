import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { heroPrimaryAction } from '../utils/heroActions.js';
import { Hero } from './Hero.jsx';
import { HeroCarousel } from './HeroCarousel.jsx';

/**
 * La acción principal de la portada usa el enlace del banner activo.
 *
 * v2.8.0 había fijado los dos CTA para que no cambiaran al rotar. El efecto
 * secundario era que el formulario del panel pedía «Enlace» y «Texto del botón»
 * para la zona `hero`, los guardaba correctamente… y el sitio los ignoraba: el
 * botón llevaba siempre a `/contacto` y decía siempre «Contacto».
 *
 * Esta suite fija el comportamiento nuevo y, sobre todo, sus bordes:
 *
 *   · hacen falta LOS DOS valores, o no hay CTA que armar;
 *   · el destino se sanea: un `javascript:` guardado no puede llegar al `href`;
 *   · al rotar, la acción es la de la pieza que se está viendo.
 *
 * Se usa `createRoot` + `act` porque es lo que hay en el proyecto: no existe
 * `@testing-library/react` y esta corrección no justifica una dependencia nueva.
 */

const banner = (extra = {}) => ({
  title: 'Temporada nueva',
  subtitle: null,
  image_url: null,
  link_url: null,
  button_label: null,
  placement: 'hero',
  position: 1,
  ...extra,
});

// Mismo interruptor que `ProductCard.test.jsx`: sin él React avisa en cada
// render de que el entorno no soporta `act(...)`.
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

function montar(ui) {
  act(() => raiz.render(<MemoryRouter>{ui}</MemoryRouter>));
}

/** El CTA principal, buscado por su marca de test. */
const cta = () => contenedor.querySelector('[data-testid="hero-cta-primary"]');

// ---------------------------------------------------------------------------
// 1-4. Las cuatro combinaciones de enlace y etiqueta
// ---------------------------------------------------------------------------

describe('la acción principal según lo que traiga el banner', () => {
  it('usa el enlace y el texto configurados cuando están los dos', () => {
    montar(
      <Hero banner={banner({ link_url: '/catalogo?sport=futbol', button_label: 'Ver fútbol' })} />,
    );

    expect(cta().textContent).toBe('Ver fútbol');
    expect(cta().getAttribute('href')).toBe('/catalogo?sport=futbol');
  });

  it('sin configuración conserva el CTA de contacto', () => {
    montar(<Hero banner={banner()} />);

    expect(cta().textContent).toBe('Contacto');
    expect(cta().getAttribute('href')).toBe('/contacto');
  });

  it('con enlace pero sin texto no arma un CTA incompleto', () => {
    montar(<Hero banner={banner({ link_url: '/catalogo' })} />);

    expect(cta().textContent).toBe('Contacto');
    expect(cta().getAttribute('href')).toBe('/contacto');
  });

  it('con texto pero sin enlace tampoco', () => {
    montar(<Hero banner={banner({ button_label: 'Ver más' })} />);

    expect(cta().textContent).toBe('Contacto');
    expect(cta().getAttribute('href')).toBe('/contacto');
  });

  it('un texto en blanco cuenta como ausente', () => {
    montar(<Hero banner={banner({ link_url: '/catalogo', button_label: '   ' })} />);

    expect(cta().textContent).toBe('Contacto');
  });
});

// ---------------------------------------------------------------------------
// 7. Esquemas peligrosos
// ---------------------------------------------------------------------------

describe('un enlace inseguro nunca llega al href', () => {
  const PELIGROSOS = [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '//evil.example/phishing',
    '/\\evil.example',
  ];

  it.each(PELIGROSOS)('descarta %s y cae al fallback', (peligroso) => {
    montar(<Hero banner={banner({ link_url: peligroso, button_label: 'Hacé clic' })} />);

    expect(cta().getAttribute('href')).toBe('/contacto');
    expect(cta().textContent).toBe('Contacto');
  });

  it('el saneamiento se decide sin renderizar', () => {
    const accion = heroPrimaryAction(banner({ link_url: 'javascript:alert(1)', button_label: 'X' }));

    expect(accion.custom).toBe(false);
    expect(accion.href).toBe('/contacto');
  });

  it('una URL http(s) absoluta sí se admite', () => {
    montar(
      <Hero
        banner={banner({ link_url: 'https://wa.me/595981123456', button_label: 'Escribinos' })}
      />,
    );

    expect(cta().getAttribute('href')).toBe('https://wa.me/595981123456');
    expect(cta().textContent).toBe('Escribinos');
  });

  it('un link_url que no es texto no rompe el render', () => {
    montar(<Hero banner={banner({ link_url: 42, button_label: 'X' })} />);

    expect(cta().getAttribute('href')).toBe('/contacto');
  });
});

// ---------------------------------------------------------------------------
// 5-6. Rotación
// ---------------------------------------------------------------------------

describe('al rotar, el CTA es el de la pieza que se ve', () => {
  const primero = banner({
    title: 'Pieza uno',
    position: 1,
    link_url: '/catalogo?sport=futbol',
    button_label: 'Ver fútbol',
  });
  const segundo = banner({
    title: 'Pieza dos',
    position: 2,
    link_url: '/catalogo?sport=basquet',
    button_label: 'Ver básquet',
  });

  /** El control de avance del carrusel, sea botón o punto. */
  function avanzar() {
    const botones = [...contenedor.querySelectorAll('button')];
    const siguiente =
      botones.find((b) => /siguiente|next/i.test(b.getAttribute('aria-label') || '')) ??
      botones[botones.length - 1];
    act(() => siguiente.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  }

  it('arranca con el CTA del primero', () => {
    montar(<HeroCarousel banners={[primero, segundo]} />);

    expect(cta().textContent).toBe('Ver fútbol');
    expect(cta().getAttribute('href')).toBe('/catalogo?sport=futbol');
  });

  it('tras avanzar, el CTA es el del segundo y no queda el del anterior', () => {
    montar(<HeroCarousel banners={[primero, segundo]} />);
    avanzar();

    expect(cta().textContent).toBe('Ver básquet');
    expect(cta().getAttribute('href')).toBe('/catalogo?sport=basquet');
    // Lo que importa de verdad: el destino anterior desapareció del documento.
    expect(contenedor.innerHTML).not.toContain('sport=futbol');
  });

  it('una pieza sin CTA propio vuelve al fallback al rotar hacia ella', () => {
    const sinCta = banner({ title: 'Pieza tres', position: 2 });
    montar(<HeroCarousel banners={[primero, sinCta]} />);
    avanzar();

    expect(cta().textContent).toBe('Contacto');
    expect(cta().getAttribute('href')).toBe('/contacto');
  });
});

// ---------------------------------------------------------------------------
// 8-9. No regresión y accesibilidad
// ---------------------------------------------------------------------------

describe('lo que ya funcionaba sigue igual', () => {
  const enlaces = () => [...contenedor.querySelectorAll('a')];

  it('la acción secundaria de promociones se conserva siempre', () => {
    montar(<Hero banner={banner({ link_url: '/catalogo', button_label: 'Ver' })} />);

    expect(enlaces().some((a) => a.textContent === 'Promociones')).toBe(true);
  });

  it('sigue habiendo dos acciones, con CTA propio o sin él', () => {
    montar(<Hero banner={banner()} />);
    expect(enlaces()).toHaveLength(2);

    montar(<Hero banner={banner({ link_url: '/catalogo', button_label: 'Ver' })} />);
    expect(enlaces()).toHaveLength(2);
  });

  it('sin banner no renderiza nada', () => {
    montar(<Hero banner={null} />);

    expect(contenedor.textContent).toBe('');
  });

  it('la sección sigue etiquetada por su título', () => {
    montar(<Hero banner={banner({ title: 'Temporada nueva' })} titleId="hero-title" />);
    const seccion = contenedor.querySelector('section');

    expect(seccion.getAttribute('aria-labelledby')).toBe('hero-title');
    expect(contenedor.querySelector('#hero-title').textContent).toBe('Temporada nueva');
  });

  it('el CTA es un enlace accesible por teclado con nombre propio', () => {
    montar(<Hero banner={banner({ link_url: '/catalogo', button_label: 'Ver catálogo' })} />);

    // Un `<a href>` entra en el orden de tabulación sin `tabindex` explícito.
    expect(cta().tagName).toBe('A');
    expect(cta().hasAttribute('href')).toBe(true);
    expect(cta().getAttribute('tabindex')).toBeNull();
    expect(cta().textContent.trim()).toBe('Ver catálogo');
  });
});
