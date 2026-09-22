import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { ProductRail } from './ProductRail.jsx';

/**
 * Aviso de cambio de imagen a nivel de carril (`SectionHeader.test.jsx`
 * cubre el encabezado en aislamiento). Acá lo que importa es la condición
 * que decide si `ProductRail` lo activa: alcanza con que **uno** de los
 * productos del carril tenga segunda foto — no hace falta que la tengan
 * todos — para que el aviso, una sola vez por carril, tenga sentido.
 */

const TEXTO_AVISO = 'Mantené apretado o pasá el cursor para cambiar de imagen';

const PRODUCTO_SIN_SEGUNDA_FOTO = {
  slug: 'pelota-topper',
  name: 'Pelota Topper',
  list_price: 45000,
  sale_price: null,
  discount_percentage: null,
  is_new: false,
  availability: 'available',
  thumbnail_url: '/uploads/products/1/principal-400.webp',
  secondary_thumbnail_url: null,
  brand: { name: 'Topper' },
  available_sizes: [],
};

const PRODUCTO_CON_SEGUNDA_FOTO = {
  ...PRODUCTO_SIN_SEGUNDA_FOTO,
  slug: 'botin-adidas-predator',
  name: 'Botín Adidas Predator',
  secondary_thumbnail_url: '/uploads/products/65/secundaria-400.webp',
};

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function montar(products) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ProductRail id="portada-test" title="Destacados" href="/catalogo" products={products} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  });
  return contenedor;
}

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

describe('ProductRail — aviso de cambio de imagen', () => {
  it('ningún producto del carril tiene segunda foto: no aparece el aviso', () => {
    const contenedor = montar([PRODUCTO_SIN_SEGUNDA_FOTO]);

    expect(contenedor.textContent).not.toContain(TEXTO_AVISO);
  });

  it('al menos un producto tiene segunda foto: aparece el aviso, una sola vez', () => {
    const contenedor = montar([PRODUCTO_SIN_SEGUNDA_FOTO, PRODUCTO_CON_SEGUNDA_FOTO]);

    const apariciones = [...contenedor.querySelectorAll('p')].filter(
      (p) => p.textContent === TEXTO_AVISO,
    );
    expect(apariciones).toHaveLength(1);
  });

  it('el carril sigue mostrando sus tarjetas junto con el aviso', () => {
    const contenedor = montar([PRODUCTO_CON_SEGUNDA_FOTO]);

    expect(contenedor.querySelector('article')).not.toBeNull();
    expect(contenedor.textContent).toContain(PRODUCTO_CON_SEGUNDA_FOTO.name);
  });
});
