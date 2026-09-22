import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductCard } from './ProductCard.jsx';

/**
 * Regresión del bloqueo de la página tras mantener presionada una tarjeta.
 *
 * Toda la tarjeta es un enlace (`.link::after` cubre el `<article>`) y encima
 * lleva imágenes. Enlaces e imágenes son arrastrables de forma nativa: mantener
 * presionado y moverse unos píxeles hacía que el navegador iniciara un drag
 * HTML5 y matara la interacción de puntero en `pointercancel`, sin `mouseup` ni
 * `click`. Verificado en el navegador antes de corregir:
 *
 *   pointerdown → mousedown → dragstart → pointercancel → dragend
 *
 * jsdom no implementa el arrastre nativo, así que no puede provocar ese
 * `dragstart` por su cuenta. Lo que sí puede verificarse —y es exactamente el
 * contrato que corrige la causa raíz— es que un `dragstart` nacido dentro de la
 * tarjeta quede cancelado, y que un `pointercancel` no deje el gesto abierto.
 */

const PRODUCTO = {
  slug: 'botin-adidas-predator',
  name: 'Botín Adidas Predator',
  list_price: 720000,
  sale_price: 576000,
  discount_percentage: 20,
  is_new: true,
  availability: 'available',
  thumbnail_url: '/uploads/products/65/principal-400.webp',
  secondary_thumbnail_url: '/uploads/products/65/secundaria-400.webp',
  brand: { name: 'Adidas' },
  available_sizes: [{ slug: '40', name: '40' }],
};

let contenedor;
let root;

/**
 * Publica la ruta actual en el DOM. `defaultPrevented` no sirve para saber si
 * la tarjeta se tragó un clic: React Router cancela por diseño todo clic de
 * `<Link>` para navegar del lado del cliente. Lo que hay que observar es el
 * resultado real —si el producto se abrió o no—.
 */
function SondaDeRuta() {
  return <span data-testid="ruta">{useLocation().pathname}</span>;
}

const ruta = () => contenedor.querySelector('[data-testid="ruta"]').textContent;

function montar(producto = PRODUCTO) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/catalogo']}>
          <ProductCard product={producto} />
          <SondaDeRuta />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return contenedor.querySelector('article');
}

/** Dispara un evento que burbujea y es cancelable, como los nativos. */
function disparar(elemento, tipo, EventoClase = Event, extra = {}) {
  const evento = new EventoClase(tipo, { bubbles: true, cancelable: true, ...extra });
  elemento.dispatchEvent(evento);
  return evento;
}

/** El toque táctil se simula con un `Touch` mínimo: jsdom no trae TouchEvent. */
function dispararToque(elemento, tipo, { x = 50, y = 50 } = {}) {
  const evento = new Event(tipo, { bubbles: true, cancelable: true });
  evento.touches = tipo === 'touchend' ? [] : [{ clientX: x, clientY: y }];
  evento.changedTouches = [{ clientX: x, clientY: y }];
  elemento.dispatchEvent(evento);
  return evento;
}

// React 18 exige esta bandera para reconocer el entorno de `act`. Va a nivel de
// módulo: el primer render ocurre antes de que corra cualquier `beforeEach`.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
  vi.useRealTimers();
});

describe('ProductCard — arrastre nativo tras mantener presionado', () => {
  it('cancela el dragstart que nace en el enlace que cubre la tarjeta', () => {
    const tarjeta = montar();
    const enlace = tarjeta.querySelector('a[href*="/producto/"]');

    const evento = disparar(enlace, 'dragstart');

    // Sin esto el navegador arranca un drag HTML5 del enlace, la interacción
    // muere en `pointercancel` y nunca llega el `click`.
    expect(evento.defaultPrevented).toBe(true);
  });

  it('cancela el dragstart que nace en las imágenes del producto', () => {
    const tarjeta = montar();
    const imagenes = tarjeta.querySelectorAll('img');

    expect(imagenes.length).toBeGreaterThan(0);
    for (const imagen of imagenes) {
      expect(disparar(imagen, 'dragstart').defaultPrevented).toBe(true);
    }
  });

  it('no deja el gesto abierto si el navegador cancela el puntero', () => {
    const tarjeta = montar();

    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(tarjeta.innerHTML).toContain('hoverImageVisible');

    // El arrastre nativo cancela el puntero sin emitir `touchend`: si no se
    // atiende, la tarjeta queda trabada en la segunda foto para siempre.
    act(() => {
      disparar(tarjeta, 'pointercancel', Event);
    });

    expect(tarjeta.innerHTML).not.toContain('hoverImageVisible');
  });
});

describe('ProductCard — la interacción normal sigue intacta', () => {
  it('el clic simple abre el detalle del producto', () => {
    const tarjeta = montar();
    const enlace = tarjeta.querySelector('a[href*="/producto/"]');

    act(() => {
      disparar(enlace, 'click', MouseEvent);
    });

    expect(ruta()).toBe(`/producto/${PRODUCTO.slug}`);
  });

  it('el toque corto abre el detalle del producto', () => {
    const tarjeta = montar();
    const enlace = tarjeta.querySelector('a[href*="/producto/"]');

    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(50); // por debajo de TOUCH_HOLD_MS
    });
    dispararToque(tarjeta, 'touchend');
    act(() => {
      disparar(enlace, 'click', MouseEvent);
    });

    expect(ruta()).toBe(`/producto/${PRODUCTO.slug}`);
  });

  it('el long-press espía la segunda foto sin abrir el producto, y no traba el toque siguiente', () => {
    const tarjeta = montar();
    const enlace = tarjeta.querySelector('a[href*="/producto/"]');

    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(500); // long-press cumplido
    });
    dispararToque(tarjeta, 'touchend');
    act(() => {
      disparar(enlace, 'click', MouseEvent);
    });

    expect(ruta()).toBe('/catalogo');

    // Y el toque siguiente vuelve a abrir el producto: la bandera del
    // long-press no queda pegada dejando la tarjeta sorda.
    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(50);
    });
    dispararToque(tarjeta, 'touchend');
    act(() => {
      disparar(enlace, 'click', MouseEvent);
    });

    expect(ruta()).toBe(`/producto/${PRODUCTO.slug}`);
  });

  it('abandona el gesto si el dedo se desplaza (scroll) y no traba la tarjeta', () => {
    const tarjeta = montar();

    dispararToque(tarjeta, 'touchstart', { x: 50, y: 50 });
    dispararToque(tarjeta, 'touchmove', { x: 50, y: 200 });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(tarjeta.innerHTML).not.toContain('hoverImageVisible');
  });

  it('no monta la segunda foto cuando el producto no la tiene', () => {
    const tarjeta = montar({ ...PRODUCTO, secondary_thumbnail_url: null });

    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(tarjeta.innerHTML).not.toContain('hoverImage');
  });

  it('al soltar sin desplazarse, vuelve a la imagen principal', () => {
    const tarjeta = montar();

    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(tarjeta.innerHTML).toContain('hoverImageVisible');

    act(() => {
      dispararToque(tarjeta, 'touchend');
    });

    expect(tarjeta.innerHTML).not.toContain('hoverImageVisible');
  });

  it('mantener presionada la tarjeta no bloquea elegir un talle', () => {
    const tarjeta = montar();
    const botonTalle = tarjeta.querySelector('[role="radiogroup"] button');

    // El dedo se apoya sobre la tarjeta entera (arranca el timer del
    // long-press de la foto) y, sin soltar, se elige un talle: son dos
    // gestos independientes, uno no debe frenar al otro.
    dispararToque(tarjeta, 'touchstart');
    act(() => {
      vi.advanceTimersByTime(500);
    });
    act(() => {
      disparar(botonTalle, 'click', MouseEvent);
    });

    expect(botonTalle.getAttribute('aria-pressed')).toBe('true');
  });
});

/**
 * «Bajo stock» es información de inventario para el administrador
 * (`ProductsTable`, `VariantsSection`), no un mensaje para el cliente: la
 * tarjeta pública no debe mostrarlo bajo ningún estado. El stock real —
 * disponibilidad de talles, compra rápida— sigue intacto; solo cambia el
 * badge visual.
 */
describe('ProductCard — el badge de disponibilidad nunca dice "Stock bajo"', () => {
  it('no muestra ningún badge con stock disponible', () => {
    const tarjeta = montar({ ...PRODUCTO, availability: 'available' });

    expect(tarjeta.textContent).not.toContain('Disponible');
    expect(tarjeta.textContent).not.toContain('Stock bajo');
  });

  it('no muestra "Stock bajo" con stock bajo — no muestra ningún badge', () => {
    const tarjeta = montar({ ...PRODUCTO, availability: 'low_stock' });

    expect(tarjeta.textContent).not.toContain('Stock bajo');
  });

  it('sigue avisando cuando no hay stock', () => {
    const tarjeta = montar({ ...PRODUCTO, availability: 'out_of_stock' });

    expect(tarjeta.textContent).toContain('No disponible');
  });
});
