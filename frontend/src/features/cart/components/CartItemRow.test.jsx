import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CartItemRow } from './CartItemRow.jsx';

/**
 * «Stock bajo» es información de inventario, no un mensaje para el cliente
 * (mismo criterio que `ProductCard`, ver `ProductCard.test.jsx`): el carrito
 * sigue diciendo si un ítem está disponible o no, pero nunca ese estado
 * intermedio. La cantidad, el tope de unidades y el resto del stock real no
 * cambian — acá solo se prueba el texto visible.
 */

const ITEM_BASE = {
  variant_id: 501,
  quantity: 1,
  snapshot: {
    name: 'Botín Adidas Predator',
    brand: 'Adidas',
    size: '40',
    thumbnail_url: null,
    list_price: 720000,
    sale_price: null,
    availability: 'available',
    available_quantity: 3,
  },
};

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar(item) {
  act(() => {
    root.render(
      <ul>
        <CartItemRow item={item} changed={false} onQuantityChange={vi.fn()} onRemove={vi.fn()} />
      </ul>,
    );
  });
}

describe('CartItemRow — la etiqueta de disponibilidad nunca dice "Stock bajo"', () => {
  it('muestra "Disponible" con stock normal', () => {
    montar(ITEM_BASE);

    expect(contenedor.textContent).toContain('Disponible');
  });

  it('no muestra "Stock bajo" con stock bajo', () => {
    montar({
      ...ITEM_BASE,
      snapshot: { ...ITEM_BASE.snapshot, availability: 'low_stock' },
    });

    expect(contenedor.textContent).not.toContain('Stock bajo');
  });

  it('sigue avisando cuando no hay stock', () => {
    montar({
      ...ITEM_BASE,
      snapshot: { ...ITEM_BASE.snapshot, availability: 'out_of_stock' },
    });

    expect(contenedor.textContent).toContain('No disponible');
  });
});

describe('CartItemRow — el talle se muestra tal cual, sin importar su formato', () => {
  it.each(['8.5', '35/36', '38-39', 'Único', 'XL'])('muestra el talle "%s"', (talle) => {
    montar({ ...ITEM_BASE, snapshot: { ...ITEM_BASE.snapshot, size: talle } });

    expect(contenedor.textContent).toContain(talle);
  });
});
