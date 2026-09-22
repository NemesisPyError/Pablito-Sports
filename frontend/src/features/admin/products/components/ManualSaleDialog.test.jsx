import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El diálogo de venta manual, con la red simulada (§9.19).
 *
 * Se sustituyen los tres hooks de datos en vez de montar un `QueryClient`: lo
 * que se prueba acá es el comportamiento del formulario —qué se puede elegir,
 * qué se calcula, qué se manda y qué se muestra—, no react-query.
 *
 * Dos cosas que estos tests protegen y que serían fáciles de romper después:
 *
 *   · **una variante sin stock no se puede elegir**: no aparece en el desplegable,
 *     en vez de ofrecerla y que el backend la rechace;
 *   · **tras una venta exitosa NO se pinta un stock adivinado**: se invalida y se
 *     vuelve a leer. El resumen muestra lo que respondió el servidor.
 *
 * `createRoot` + `act`, el patrón del proyecto: no hay `@testing-library/react`
 * y esto no justifica una dependencia nueva.
 */

const estado = {
  listado: { data: { items: [] }, isLoading: false },
  detalle: { data: null, isLoading: false },
  mutacion: {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
};

vi.mock('../hooks/useAdminProducts.js', () => ({
  useAdminProducts: () => estado.listado,
  ADMIN_PRODUCTS_KEY: ['admin', 'products'],
}));
vi.mock('../hooks/useProductActions.js', () => ({
  useAdminProduct: () => estado.detalle,
  ADMIN_PRODUCT_KEY: (id) => ['admin', 'product', id],
}));
vi.mock('../hooks/useManualSale.js', () => ({
  useRegisterManualSale: () => estado.mutacion,
}));

const { ManualSaleDialog } = await import('./ManualSaleDialog.jsx');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PRODUCTO = {
  id: 7,
  name: 'Remera Nike',
  list_price: 180000,
  effective_price: 150000,
  variants: [
    { id: 21, size: { id: 3, name: 'M' }, quantity: 5 },
    { id: 22, size: { id: 4, name: 'L' }, quantity: 2 },
    { id: 23, size: { id: 5, name: 'XL' }, quantity: 0 },
  ],
};

let contenedor;
let raiz;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);

  estado.listado = { data: { items: [{ id: 7, name: 'Remera Nike' }] }, isLoading: false };
  estado.detalle = { data: null, isLoading: false };
  estado.mutacion = {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.clearAllMocks();
});

function montar(props = {}) {
  act(() => raiz.render(<ManualSaleDialog isOpen onClose={() => {}} {...props} />));
}

const porId = (id) => contenedor.querySelector(`#${id}`);
const porTest = (nombre) => contenedor.querySelector(`[data-testid="${nombre}"]`);
const todos = (nombre) => [...contenedor.querySelectorAll(`[data-testid="${nombre}"]`)];

/** Escribe en un campo controlado por React. */
function escribir(elemento, valor) {
  const prototipo =
    elemento.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototipo, 'value').set.call(elemento, valor);
    elemento.dispatchEvent(new Event('change', { bubbles: true }));
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const pulsar = (elemento) =>
  act(() => elemento.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));

/** Elige el producto y deja el detalle cargado, como haría la consulta real. */
function elegirProducto() {
  escribir(porId('venta-producto'), '7');
  estado.detalle = { data: PRODUCTO, isLoading: false };
  act(() => raiz.render(<ManualSaleDialog isOpen onClose={() => {}} />));
}

function agregarLinea({ talle = '21', cantidad = '2', precio } = {}) {
  escribir(porId('venta-talle'), talle);
  if (precio !== undefined) escribir(porId('venta-precio'), precio);
  escribir(porId('venta-cantidad'), cantidad);
  pulsar(porTest('agregar-linea'));
}

// ---------------------------------------------------------------------------
// Apertura
// ---------------------------------------------------------------------------

describe('apertura del diálogo', () => {
  it('cerrado no renderiza nada', () => {
    act(() => raiz.render(<ManualSaleDialog isOpen={false} onClose={() => {}} />));

    expect(contenedor.innerHTML).toBe('');
  });

  it('abierto muestra el diálogo con su título', () => {
    montar();

    expect(contenedor.querySelector('[role="dialog"]')).not.toBeNull();
    expect(porId('manualSaleTitle').textContent).toBe('Registrar venta');
  });

  it('empieza sin líneas y con el botón de confirmar deshabilitado', () => {
    montar();

    expect(porTest('sin-lineas')).not.toBeNull();
    expect(porTest('confirmar-venta').disabled).toBe(true);
  });

  it('`Escape` pide cerrar', () => {
    const cerrar = vi.fn();
    montar({ onClose: cerrar });

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));

    expect(cerrar).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Selección de producto y variante
// ---------------------------------------------------------------------------

describe('elegir producto y talle', () => {
  it('ofrece los productos del listado', () => {
    montar();
    const opciones = [...porId('venta-producto').options].map((o) => o.textContent);

    expect(opciones).toContain('Remera Nike');
  });

  it('al elegir producto se ofrecen sus talles', () => {
    montar();
    elegirProducto();
    const opciones = [...porId('venta-talle').options].map((o) => o.textContent);

    expect(opciones.some((texto) => texto.startsWith('M'))).toBe(true);
    expect(opciones.some((texto) => texto.startsWith('L'))).toBe(true);
  });

  it('una variante sin stock no se puede elegir', () => {
    montar();
    elegirProducto();
    const opciones = [...porId('venta-talle').options].map((o) => o.textContent);

    expect(opciones.some((texto) => texto.startsWith('XL'))).toBe(false);
  });

  it('cada talle muestra su stock disponible', () => {
    montar();
    elegirProducto();
    const opciones = [...porId('venta-talle').options].map((o) => o.textContent);

    expect(opciones.some((texto) => texto.includes('5 disponibles'))).toBe(true);
  });

  it('al elegir un talle informa el máximo disponible', () => {
    montar();
    elegirProducto();
    escribir(porId('venta-talle'), '21');

    expect(porTest('stock-disponible').textContent).toContain('5');
  });
});

// ---------------------------------------------------------------------------
// Precio
// ---------------------------------------------------------------------------

describe('el precio', () => {
  it('se carga solo con el precio vigente, no con el de lista', () => {
    montar();
    elegirProducto();

    expect(porId('venta-precio').value).toBe('150000');
  });

  it('se puede modificar a mano', () => {
    montar();
    elegirProducto();
    escribir(porId('venta-precio'), '99000');

    expect(porId('venta-precio').value).toBe('99000');
  });

  it('el precio modificado es el que se usa en la línea', () => {
    montar();
    elegirProducto();
    agregarLinea({ cantidad: '2', precio: '99000' });

    expect(porTest('subtotal').textContent).toContain('198.000');
  });
});

// ---------------------------------------------------------------------------
// Líneas, subtotales y total
// ---------------------------------------------------------------------------

describe('las líneas de la venta', () => {
  it('agregar una línea la muestra en la tabla', () => {
    montar();
    elegirProducto();
    agregarLinea();

    expect(todos('linea-venta')).toHaveLength(1);
    expect(porTest('sin-lineas')).toBeNull();
  });

  it('calcula el subtotal de la línea', () => {
    montar();
    elegirProducto();
    agregarLinea({ cantidad: '2' });

    expect(porTest('subtotal').textContent).toContain('300.000');
  });

  it('con varias líneas suma el total', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    agregarLinea({ talle: '22', cantidad: '1' });

    expect(todos('linea-venta')).toHaveLength(2);
    expect(porTest('total-venta').textContent).toContain('450.000');
  });

  it('volver a elegir el mismo talle suma a la línea que ya está', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    agregarLinea({ talle: '21', cantidad: '1' });

    expect(todos('linea-venta')).toHaveLength(1);
    expect(porTest('total-venta').textContent).toContain('450.000');
  });

  it('se puede quitar una línea', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '1' });
    pulsar(contenedor.querySelector('[aria-label="Quitar Remera Nike"]'));

    expect(todos('linea-venta')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tope por stock
// ---------------------------------------------------------------------------

describe('no se puede pasar del stock', () => {
  it('rechaza una cantidad mayor a la disponible y no agrega la línea', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '22', cantidad: '5' });

    expect(todos('linea-venta')).toHaveLength(0);
    expect(contenedor.querySelector('[role="alert"]').textContent).toContain('2');
  });

  it('el tope cuenta lo ya agregado de esa misma variante', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '22', cantidad: '2' });
    agregarLinea({ talle: '22', cantidad: '1' });

    expect(todos('linea-venta')).toHaveLength(1);
    expect(contenedor.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('rechaza una cantidad que no es un entero positivo', () => {
    montar();
    elegirProducto();
    agregarLinea({ cantidad: '0' });

    expect(todos('linea-venta')).toHaveLength(0);
  });

  it('sin talle elegido avisa en vez de agregar', () => {
    montar();
    elegirProducto();
    escribir(porId('venta-cantidad'), '1');
    pulsar(porTest('agregar-linea'));

    expect(todos('linea-venta')).toHaveLength(0);
    expect(contenedor.querySelector('[role="alert"]').textContent).toContain('talle');
  });
});

// ---------------------------------------------------------------------------
// Confirmación
// ---------------------------------------------------------------------------

describe('confirmar la venta', () => {
  it('manda al backend las líneas en el contrato de §9.19', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    pulsar(porTest('confirmar-venta'));

    expect(estado.mutacion.mutate).toHaveBeenCalledTimes(1);
    expect(estado.mutacion.mutate.mock.calls[0][0]).toEqual([
      { product_id: 7, variant_id: 21, quantity: 2, unit_price: 150000 },
    ]);
  });

  it('el botón muestra el total que se va a cobrar', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });

    expect(porTest('confirmar-venta').textContent).toContain('300.000');
  });

  it('sin líneas no se puede confirmar', () => {
    montar();

    expect(porTest('confirmar-venta').disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Estado de carga y errores
// ---------------------------------------------------------------------------

describe('mientras se registra', () => {
  it('el botón indica el progreso y no se puede volver a pulsar', () => {
    estado.mutacion.isPending = true;
    montar();

    expect(porTest('confirmar-venta').textContent).toContain('Registrando');
    expect(porTest('confirmar-venta').disabled).toBe(true);
  });

  it('no se puede cerrar con `Escape` a mitad del registro', () => {
    const cerrar = vi.fn();
    estado.mutacion.isPending = true;
    montar({ onClose: cerrar });

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));

    expect(cerrar).not.toHaveBeenCalled();
  });
});

describe('errores del backend', () => {
  it('un 409 explica que no se descontó nada', () => {
    estado.mutacion.isError = true;
    estado.mutacion.error = { status: 409 };
    montar();

    const alertas = [...contenedor.querySelectorAll('[role="alert"]')].map((a) => a.textContent);
    expect(alertas.some((texto) => texto.includes('No se registró nada'))).toBe(true);
  });

  it('el borrador se conserva para poder corregirlo', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });

    estado.mutacion.isError = true;
    estado.mutacion.error = { status: 409 };
    act(() => raiz.render(<ManualSaleDialog isOpen onClose={() => {}} />));

    expect(todos('linea-venta')).toHaveLength(1);
  });

  it('un fallo de red se distingue de un rechazo por stock', () => {
    estado.mutacion.isError = true;
    estado.mutacion.error = { isNetworkFailure: true };
    montar();

    const alertas = [...contenedor.querySelectorAll('[role="alert"]')].map((a) => a.textContent);
    expect(alertas.some((texto) => texto.includes('conectar'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Venta registrada
// ---------------------------------------------------------------------------

describe('cuando la venta se registra', () => {
  const VENTA = {
    id: 3,
    total_amount: 300000,
    created_at: '2026-09-09T10:00:00+00:00',
    administrator_id: 9,
    items: [
      {
        product_id: 7,
        product_name: 'Remera Nike',
        variant_id: 21,
        size: { id: 3, name: 'M' },
        quantity: 2,
        unit_price: 150000,
        subtotal: 300000,
        remaining_quantity: 3,
      },
    ],
  };

  /** Ejecuta el `onSuccess` que el componente le pasa a la mutación. */
  function registrarConExito() {
    const [, opciones] = estado.mutacion.mutate.mock.calls[0];
    act(() => opciones.onSuccess(VENTA));
  }

  it('muestra la confirmación con el total', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    pulsar(porTest('confirmar-venta'));
    registrarConExito();

    expect(porTest('venta-registrada')).not.toBeNull();
    expect(porTest('venta-registrada').textContent).toContain('300.000');
  });

  it('el stock que se muestra es el que devolvió el servidor, no uno calculado', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    pulsar(porTest('confirmar-venta'));
    registrarConExito();

    expect(porTest('venta-registrada').textContent).toContain('Quedan 3 unidades');
  });

  it('el borrador se vacía: no se puede registrar la misma venta dos veces', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    pulsar(porTest('confirmar-venta'));
    registrarConExito();

    expect(todos('linea-venta')).toHaveLength(0);
  });

  it('se puede empezar otra venta desde la confirmación', () => {
    montar();
    elegirProducto();
    agregarLinea({ talle: '21', cantidad: '2' });
    pulsar(porTest('confirmar-venta'));
    registrarConExito();

    pulsar([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Registrar otra venta'));

    expect(porTest('venta-registrada')).toBeNull();
    expect(porTest('sin-lineas')).not.toBeNull();
  });
});
