import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BannerCard } from './BannerRail.jsx';

/**
 * El enlace de una pieza de carril se sanea igual que el del `Hero`.
 *
 * Quedaba una asimetría después de corregir el `Hero`: allí el destino pasaba
 * por `safeHref` y acá `link_url` iba directo al `href` del `Link`. El backend
 * acota la **longitud** de ese campo, no el esquema (05_API.md §10.13), así que
 * un `javascript:` guardado —hoy, o antes de que el formulario del panel
 * validara— llegaba al DOM tal cual.
 *
 * El contrato que fijan estos tests tiene dos mitades, y las dos importan:
 *
 *   · un enlace válido sigue navegando **exactamente igual que antes**;
 *   · uno inseguro no produce `href` alguno — la tarjeta cae al camino que ya
 *     existía para las piezas sin enlace: un bloque no accionable.
 *
 * Se usa `createRoot` + `act`, el patrón de `ProductCard.test.jsx` y
 * `Hero.test.jsx`: el proyecto no tiene `@testing-library/react` y esto no
 * justifica una dependencia nueva.
 */

const banner = (extra = {}) => ({
  title: 'Campaña de verano',
  subtitle: null,
  image_url: null,
  link_url: null,
  button_label: null,
  placement: 'news',
  position: 1,
  ...extra,
});

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

/** El enlace de la tarjeta, si la pieza resultó accionable. */
const tarjetaEnlace = () => contenedor.querySelector('a');

// ---------------------------------------------------------------------------
// 1-3. Enlaces válidos: siguen funcionando igual
// ---------------------------------------------------------------------------

describe('un enlace válido navega como siempre', () => {
  it.each([
    ['ruta interna', '/catalogo'],
    ['ruta interna con query', '/catalogo?sport=futbol'],
    ['https absoluto', 'https://example.com'],
    ['http absoluto', 'http://example.com'],
  ])('%s se conserva en el href', (_caso, enlace) => {
    montar(<BannerCard banner={banner({ link_url: enlace })} />);

    expect(tarjetaEnlace()).not.toBeNull();
    expect(tarjetaEnlace().getAttribute('href')).toBe(enlace);
  });

  it('la pieza accionable muestra su indicación', () => {
    montar(<BannerCard banner={banner({ link_url: '/catalogo', button_label: 'Ver todo' })} />);

    expect(tarjetaEnlace().textContent).toContain('Ver todo');
  });

  it('sin `button_label` conserva la indicación por defecto', () => {
    montar(<BannerCard banner={banner({ link_url: '/catalogo' })} />);

    expect(tarjetaEnlace().textContent).toContain('Ver más');
  });
});

// ---------------------------------------------------------------------------
// 4-9. Enlaces inseguros: nunca llegan al DOM
// ---------------------------------------------------------------------------

describe('un enlace inseguro no produce href', () => {
  const INSEGUROS = [
    ['javascript', 'javascript:alert(1)'],
    ['javascript con mayúsculas', 'JavaScript:alert(1)'],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
    ['protocol-relative', '//evil.example/phishing'],
    ['barra invertida', '/\\evil.example'],
  ];

  it.each(INSEGUROS)('%s no genera enlace', (_caso, inseguro) => {
    montar(<BannerCard banner={banner({ link_url: inseguro })} />);

    // Ni un `<a>` con ese destino, ni ninguno en absoluto.
    expect(tarjetaEnlace()).toBeNull();
  });

  it.each(INSEGUROS)('%s no aparece en ningún atributo del DOM', (_caso, inseguro) => {
    montar(<BannerCard banner={banner({ link_url: inseguro })} />);

    for (const elemento of contenedor.querySelectorAll('*')) {
      for (const atributo of elemento.attributes) {
        expect(atributo.value).not.toContain(inseguro);
      }
    }
  });

  it('un valor que no es texto se descarta sin romper el render', () => {
    // `42?.trim()` lanzaba `TypeError`: el encadenamiento opcional no protege
    // de un valor presente del tipo equivocado.
    for (const valor of [42, true, {}, [], ['/catalogo']]) {
      montar(<BannerCard banner={banner({ link_url: valor })} />);

      expect(tarjetaEnlace()).toBeNull();
      expect(contenedor.textContent).toContain('Campaña de verano');
    }
  });

  it('un enlace inseguro tampoco muestra la indicación de acción', () => {
    montar(<BannerCard banner={banner({ link_url: 'javascript:alert(1)', button_label: 'Clic' })} />);

    expect(contenedor.textContent).not.toContain('Clic');
    expect(contenedor.textContent).not.toContain('Ver más');
  });
});

// ---------------------------------------------------------------------------
// 10-12. Ausencia de enlace y no regresión estructural
// ---------------------------------------------------------------------------

describe('sin enlace, la pieza es un bloque no accionable', () => {
  it('no renderiza un `<a>`', () => {
    montar(<BannerCard banner={banner()} />);

    expect(tarjetaEnlace()).toBeNull();
  });

  it('un enlace inseguro cae por el MISMO camino que la ausencia de enlace', () => {
    montar(<BannerCard banner={banner()} />);
    const sinEnlace = contenedor.innerHTML;

    montar(<BannerCard banner={banner({ link_url: 'javascript:alert(1)' })} />);

    // La estructura es idéntica: no se inventó un destino ni un estado nuevo.
    expect(contenedor.innerHTML).toBe(sinEnlace);
  });

  it('el contenido de la pieza se muestra con enlace y sin él', () => {
    montar(<BannerCard banner={banner({ subtitle: 'Hasta agotar stock' })} />);
    expect(contenedor.textContent).toContain('Campaña de verano');
    expect(contenedor.textContent).toContain('Hasta agotar stock');

    montar(
      <BannerCard banner={banner({ subtitle: 'Hasta agotar stock', link_url: '/catalogo' })} />,
    );
    expect(contenedor.textContent).toContain('Campaña de verano');
    expect(contenedor.textContent).toContain('Hasta agotar stock');
  });

  it('la imagen de la pieza sigue renderizándose', () => {
    montar(
      <BannerCard banner={banner({ image_url: '/uploads/banners/abc-1600.webp', link_url: '/catalogo' })} />,
    );
    const imagen = contenedor.querySelector('img');

    expect(imagen.getAttribute('src')).toBe('/uploads/banners/abc-1600.webp');
    // Decorativa: el título ya está en el texto de la tarjeta.
    expect(imagen.getAttribute('alt')).toBe('');
  });

  it('el enlace accionable es un `<a href>` alcanzable por teclado', () => {
    montar(<BannerCard banner={banner({ link_url: '/catalogo' })} />);

    expect(tarjetaEnlace().tagName).toBe('A');
    expect(tarjetaEnlace().hasAttribute('href')).toBe(true);
    expect(tarjetaEnlace().getAttribute('tabindex')).toBeNull();
  });
});
