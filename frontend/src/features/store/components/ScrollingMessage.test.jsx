import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SCROLLING_MESSAGE, ScrollingMessage } from './ScrollingMessage.jsx';

/**
 * Franja de mensaje deslizante bajo el hero.
 *
 * La suite está partida en dos por una limitación real del entorno: Vitest
 * corre con `css: false`, así que un `*.module.css` importado desde un test
 * resuelve a `{}` y `className={styles.track}` no llega al DOM. Comprobar el
 * movimiento con `getComputedStyle` sería comprobar una cadena vacía.
 *
 * Entonces:
 *
 *   · lo que es estructura y accesibilidad se verifica renderizando;
 *   · lo que es animación, recorte y `prefers-reduced-motion` se verifica
 *     leyendo la hoja de estilos del disco, que es el mismo recurso que
 *     `fonts.test.js` usa para fijar el origen de las tipografías.
 *
 * Se usa `createRoot` + `act` porque es lo que hay en el proyecto: no existe
 * `@testing-library/react` y una franja decorativa no justifica la dependencia.
 */

const DIRECTORIO = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(DIRECTORIO, 'ScrollingMessage.module.css'), 'utf8');
const HOME = readFileSync(join(DIRECTORIO, '..', 'pages', 'HomePage.jsx'), 'utf8');

/** Devuelve el cuerpo de una regla, contando llaves para tolerar `@media`. */
function bloque(css, selector) {
  const inicio = css.indexOf(selector);
  if (inicio === -1) return '';

  const desdeLlave = css.indexOf('{', inicio);
  let profundidad = 0;

  for (let i = desdeLlave; i < css.length; i += 1) {
    if (css[i] === '{') profundidad += 1;
    if (css[i] === '}') {
      profundidad -= 1;
      if (profundidad === 0) return css.slice(desdeLlave + 1, i);
    }
  }
  return '';
}

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
  act(() => raiz.render(<ScrollingMessage />));
}

describe('ScrollingMessage — contenido y accesibilidad', () => {
  it('renderiza el texto pedido, sin alterarlo', () => {
    montar();

    expect(SCROLLING_MESSAGE).toBe(
      '• Estilo, Comodidad y calidad en cada paso ' +
        '• Calzados, prendas y accesorios para cada momento',
    );
    expect(contenedor.textContent).toContain(SCROLLING_MESSAGE);
  });

  it('repite la frase varias veces para que la franja no quede a medias', () => {
    montar();

    const copias = [...contenedor.querySelectorAll('span')].filter(
      (nodo) => nodo.textContent === SCROLLING_MESSAGE,
    );

    expect(copias.length).toBeGreaterThan(1);
    // Par: la animación recorre la mitad exacta de la fila, así que las dos
    // mitades tienen que ser idénticas o el reinicio se ve.
    expect(copias.length % 2).toBe(0);
  });

  it('la duplicación visual no se le repite al lector de pantalla', () => {
    montar();

    const copias = [...contenedor.querySelectorAll('span')].filter(
      (nodo) => nodo.textContent === SCROLLING_MESSAGE,
    );
    // Todas las copias cuelgan de un contenedor oculto para tecnologías
    // asistivas: la frase se anuncia una vez, no ocho.
    expect(copias.every((copia) => copia.closest('[aria-hidden="true"]') !== null)).toBe(true);

    const legibles = [...contenedor.querySelectorAll('.visually-hidden')].filter(
      (nodo) =>
        nodo.textContent === SCROLLING_MESSAGE && nodo.closest('[aria-hidden="true"]') === null,
    );
    expect(legibles).toHaveLength(1);
  });

  it('es una región con nombre, no un bloque anónimo', () => {
    montar();

    const franja = contenedor.querySelector('section');
    expect(franja).not.toBeNull();
    expect(franja.getAttribute('aria-label')).toBeTruthy();
  });

  it('no agrega elementos interactivos', () => {
    montar();

    expect(contenedor.querySelectorAll('a, button, input, select, textarea')).toHaveLength(0);
    expect(contenedor.querySelectorAll('[tabindex]')).toHaveLength(0);
  });

  it('no usa imágenes', () => {
    montar();

    expect(contenedor.querySelectorAll('img, svg, picture')).toHaveLength(0);
  });
});

describe('ScrollingMessage — contrato de la hoja de estilos', () => {
  it('recorta la fila para no dar scroll horizontal a la página', () => {
    expect(bloque(CSS, '.strip')).toMatch(/overflow:\s*hidden/);
  });

  it('la fila mide su contenido, que es lo que hace exacto el reinicio', () => {
    expect(bloque(CSS, '.track')).toMatch(/width:\s*max-content/);
  });

  it('anima con CSS, a velocidad constante y sin fin', () => {
    const track = bloque(CSS, '.track');

    expect(track).toMatch(/animation:/);
    expect(track).toMatch(/linear/);
    expect(track).toMatch(/infinite/);
  });

  it('el ciclo termina en la mitad exacta de la fila', () => {
    expect(bloque(CSS, '@keyframes marqueeScroll')).toMatch(/translateX\(-50%\)/);
  });

  it('detiene la animación con prefers-reduced-motion y deja el texto estático', () => {
    const reducido = bloque(CSS, '@media (prefers-reduced-motion: reduce)');

    expect(reducido).not.toBe('');
    // `animation: none` y no solo la regla global de `base.css`: esa acorta la
    // duración, lo que dejaría la fila congelada en su fotograma final —medio
    // desplazada y cortada—.
    expect(reducido).toMatch(/animation:\s*none/);
    expect(reducido).toMatch(/transform:\s*none/);
    // Una sola frase, y que pueda partirse en líneas para entrar entera.
    expect(reducido).toMatch(/display:\s*none/);
    expect(reducido).toMatch(/white-space:\s*normal/);
  });

  it('adapta tamaño y espaciado en pantallas anchas', () => {
    expect(CSS).toMatch(/@media\s*\(min-width:\s*768px\)/);
  });
});

describe('ScrollingMessage — integración en la portada', () => {
  /*
   * Se lee el archivo en vez de montar `HomePage`: la portada depende de
   * react-query, del router y de tres endpoints, y montarla acá comprobaría
   * sobre todo esos mocks. Lo que importa de esta funcionalidad es *dónde*
   * quedó la franja, y eso el archivo lo dice sin ambigüedad.
   */
  it('la portada importa el componente', () => {
    expect(HOME).toMatch(
      /import \{ ScrollingMessage \} from '\.\.\/components\/ScrollingMessage\.jsx';/,
    );
  });

  it('lo dibuja inmediatamente después del hero y antes de la sección siguiente', () => {
    const hero = HOME.indexOf('<HeroCarousel');
    const franja = HOME.indexOf('<ScrollingMessage />');
    const siguiente = HOME.indexOf('<NewArrivalsCarousel');

    expect(hero).toBeGreaterThan(-1);
    expect(franja).toBeGreaterThan(hero);
    expect(franja).toBeLessThan(siguiente);
  });
});
