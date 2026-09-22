import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CART_FORMAT_VERSION, useCartStore } from '../../cart/stores/cartStore.js';
import { productsService } from '../../products/services/productsService.js';
import { ProductCard } from './ProductCard.jsx';

/**
 * Compra rápida desde la tarjeta.
 *
 * `ProductListItemDTO.available_sizes` no trae `variant_id` ni stock, así que
 * la tarjeta resuelve la variante real recién al primer intento de selección,
 * pidiendo el mismo detalle que usa la ficha (`useProduct` → `productsService`).
 * Se mockea ese servicio, no el store del carrito: `addItem` es el mismo que
 * ya cubre `cartStore.test.js`, y acá interesa que la tarjeta lo invoque bien.
 */
vi.mock('../../products/services/productsService.js', () => ({
  productsService: { getProduct: vi.fn() },
}));

const PRODUCTO = {
  slug: 'botin-adidas-predator',
  name: 'Botín Adidas Predator',
  list_price: 720000,
  sale_price: null,
  discount_percentage: null,
  is_new: false,
  availability: 'available',
  thumbnail_url: '/uploads/products/65/principal-400.webp',
  secondary_thumbnail_url: null,
  brand: { name: 'Adidas' },
  available_sizes: [
    { slug: '40', name: '40' },
    { slug: '41', name: '41' },
  ],
};

const PRODUCTO_SIN_TALLES = {
  ...PRODUCTO,
  slug: 'pelota-topper',
  available_sizes: [],
};

const DETALLE_CON_STOCK = {
  ...PRODUCTO,
  sizes: PRODUCTO.available_sizes,
  images: [],
  variants: [
    { id: 501, size: { slug: '40', name: '40' }, availability: 'available', available_quantity: 3 },
    { id: 502, size: { slug: '41', name: '41' }, availability: 'available', available_quantity: 1 },
  ],
};

const DETALLE_SIN_STOCK_EN_41 = {
  ...DETALLE_CON_STOCK,
  variants: [
    DETALLE_CON_STOCK.variants[0],
    {
      id: 502,
      size: { slug: '41', name: '41' },
      availability: 'out_of_stock',
      available_quantity: 0,
    },
  ],
};

let contenedor;
let root;

function SondaDeRuta() {
  return <span data-testid="ruta">{useLocation().pathname}</span>;
}

const ruta = () => contenedor.querySelector('[data-testid="ruta"]').textContent;

function disparar(elemento, tipo, EventoClase = Event, extra = {}) {
  const evento = new EventoClase(tipo, { bubbles: true, cancelable: true, ...extra });
  elemento.dispatchEvent(evento);
  return evento;
}

/**
 * Deja correr las tareas pendientes hasta que React Query resuelve el fetch
 * mockeado del detalle. Cuántos ciclos de microtareas hacen falta no es
 * determinístico (depende de cómo React Query agenda la notificación), así
 * que se sondea en vez de asumir un único `setTimeout` — con uno solo, la
 * misma prueba resultaba intermitente según el orden de ejecución.
 */
async function esperarResolucion(tarjeta) {
  for (let intento = 0; intento < 20; intento += 1) {
    const cargando = [...tarjeta.querySelectorAll('button')].some(
      (b) => b.textContent === 'Cargando…',
    );
    if (!cargando) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function montar(producto = PRODUCTO) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  await act(async () => {
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

/** Selecciona un talle: primero llega el `pointerdown` que activa el fetch
 * de detalle, y solo después el `click` que fija la selección — igual que en
 * un toque o clic real. */
async function elegirTalle(tarjeta, nombreTalle) {
  const boton = [...tarjeta.querySelectorAll('button')].find((b) => b.textContent === nombreTalle);
  await act(async () => {
    disparar(boton, 'pointerdown');
    disparar(boton, 'click', MouseEvent);
  });
  await esperarResolucion(tarjeta);
  return boton;
}

function resetCart() {
  useCartStore.setState({
    format_version: CART_FORMAT_VERSION,
    content_version: 0,
    last_modified_at: null,
    items: [],
  });
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  resetCart();
  productsService.getProduct.mockReset();
  productsService.getProduct.mockResolvedValue(DETALLE_CON_STOCK);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('ProductCard — compra rápida', () => {
  it('muestra los talles disponibles como controles interactivos, sin ninguno seleccionado', async () => {
    const tarjeta = await montar();

    const grupo = tarjeta.querySelector('[role="radiogroup"]');
    expect(grupo).not.toBeNull();

    const botones = [...tarjeta.querySelectorAll('button')];
    expect(botones.map((b) => b.textContent)).toEqual(['40', '41']);
    expect(botones.every((b) => b.getAttribute('aria-pressed') === 'false')).toBe(true);
  });

  it('producto sin talles: no ofrece compra rápida (comportamiento actual)', async () => {
    const tarjeta = await montar(PRODUCTO_SIN_TALLES);

    expect(tarjeta.querySelector('[role="radiogroup"]')).toBeNull();
    expect(tarjeta.querySelectorAll('button')).toHaveLength(0);
  });

  it('seleccionar un talle lo marca y no navega al detalle del producto', async () => {
    const tarjeta = await montar();

    const boton40 = await elegirTalle(tarjeta, '40');

    expect(boton40.getAttribute('aria-pressed')).toBe('true');
    expect(ruta()).toBe('/catalogo');
  });

  it('cambiar de talle mueve la selección al nuevo y quita la anterior', async () => {
    const tarjeta = await montar();

    await elegirTalle(tarjeta, '40');
    const boton41 = await elegirTalle(tarjeta, '41');

    const boton40 = [...tarjeta.querySelectorAll('button')].find((b) => b.textContent === '40');
    expect(boton41.getAttribute('aria-pressed')).toBe('true');
    expect(boton40.getAttribute('aria-pressed')).toBe('false');
  });

  it('no ofrece agregar al carrito hasta que hay un talle seleccionado', async () => {
    const tarjeta = await montar();

    const botones = [...tarjeta.querySelectorAll('button')].map((b) => b.textContent);
    expect(botones).not.toContain('Agregar');
  });

  it('con un talle sin stock real, deshabilita ese talle y no permite agregar', async () => {
    productsService.getProduct.mockResolvedValue(DETALLE_SIN_STOCK_EN_41);
    const tarjeta = await montar();

    const boton41 = await elegirTalle(tarjeta, '41');

    expect(boton41.disabled).toBe(true);
    const agregar = [...tarjeta.querySelectorAll('button')].find(
      (b) => b.textContent === 'Agregar',
    );
    expect(agregar.disabled).toBe(true);
  });

  it('agrega la variante elegida al carrito existente y no navega al detalle', async () => {
    const tarjeta = await montar();
    await elegirTalle(tarjeta, '41');

    const agregar = [...tarjeta.querySelectorAll('button')].find(
      (b) => b.textContent === 'Agregar',
    );
    expect(agregar.disabled).toBe(false);

    await act(async () => {
      disparar(agregar, 'click', MouseEvent);
    });

    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({ variant_id: 502, quantity: 1 }),
    ]);
    expect(useCartStore.getState().items[0].snapshot.size).toBe('41');
    expect(ruta()).toBe('/catalogo');
  });

  it('muestra «Ver carrito» después de agregar, y navega al carrito existente al usarlo', async () => {
    const tarjeta = await montar();
    await elegirTalle(tarjeta, '40');
    const agregar = [...tarjeta.querySelectorAll('button')].find(
      (b) => b.textContent === 'Agregar',
    );

    await act(async () => {
      disparar(agregar, 'click', MouseEvent);
    });

    const verCarrito = [...tarjeta.querySelectorAll('a')].find(
      (a) => a.textContent === 'Ver carrito',
    );
    expect(verCarrito).not.toBeUndefined();

    await act(async () => {
      disparar(verCarrito, 'click', MouseEvent);
    });

    expect(ruta()).toBe('/carrito');
  });

  it('el producto permanece en la página tras agregar y no duplica la línea al repetir la acción', async () => {
    const tarjeta = await montar();
    await elegirTalle(tarjeta, '40');
    const agregar = [...tarjeta.querySelectorAll('button')].find(
      (b) => b.textContent === 'Agregar',
    );

    await act(async () => {
      disparar(agregar, 'click', MouseEvent);
    });
    expect(ruta()).toBe('/catalogo');
    expect(tarjeta.querySelector('h3')?.textContent).toBe(PRODUCTO.name);

    // Deseleccionar y volver a elegir el mismo talle repone «Agregar» (tras
    // agregar, la tarjeta muestra «Ver carrito» en su lugar): repetir la
    // acción sobre la misma variante suma cantidad a la línea existente, no
    // crea una segunda.
    await elegirTalle(tarjeta, '40'); // deselecciona
    await elegirTalle(tarjeta, '40'); // vuelve a elegir el mismo talle
    const agregarDeNuevo = [...tarjeta.querySelectorAll('button')].find(
      (b) => b.textContent === 'Agregar',
    );
    await act(async () => {
      disparar(agregarDeNuevo, 'click', MouseEvent);
    });

    expect(useCartStore.getState().items).toHaveLength(1);
    expect(useCartStore.getState().items[0]).toEqual(
      expect.objectContaining({ variant_id: 501, quantity: 2 }),
    );
  });

  it('acepta talles con cualquier formato alfanumérico (RN-15b, v1.5.0)', async () => {
    const productoAlfanumerico = {
      ...PRODUCTO,
      slug: 'campera-talle-unico',
      available_sizes: [{ slug: 'unico', name: 'Único' }],
    };
    productsService.getProduct.mockResolvedValue({
      ...DETALLE_CON_STOCK,
      sizes: productoAlfanumerico.available_sizes,
      variants: [
        { id: 601, size: { slug: 'unico', name: 'Único' }, availability: 'available', available_quantity: 5 },
      ],
    });

    const tarjeta = await montar(productoAlfanumerico);
    await elegirTalle(tarjeta, 'Único');
    const agregar = [...tarjeta.querySelectorAll('button')].find((b) => b.textContent === 'Agregar');

    await act(async () => {
      disparar(agregar, 'click', MouseEvent);
    });

    expect(useCartStore.getState().items[0]).toEqual(
      expect.objectContaining({ variant_id: 601, quantity: 1 }),
    );
    expect(useCartStore.getState().items[0].snapshot.size).toBe('Único');
  });
});
