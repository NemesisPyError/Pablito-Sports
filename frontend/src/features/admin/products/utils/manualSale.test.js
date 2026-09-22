import { describe, expect, it } from 'vitest';

import {
  addLine,
  buildLine,
  committedQuantity,
  lineSubtotal,
  parseEntero,
  removeLine,
  saleErrorMessage,
  saleTotal,
  sellableVariants,
  toRequestItems,
} from './manualSale.js';

/**
 * La aritmética y las reglas de una venta manual, sin montar el diálogo.
 *
 * Lo que se fija acá es sobre todo el borde incómodo: **la misma variante
 * agregada dos veces**. Son dos descuentos sobre el mismo stock, así que
 * sumarlas por separado dejaría pasar una venta que el backend rechaza —o,
 * peor, una que cabe línea por línea pero no en conjunto—. Se fusionan, y el
 * tope se comprueba contra el total ya comprometido, no contra la línea suelta.
 *
 * Nada de esto es una garantía: el stock puede cambiar mientras el modal está
 * abierto y el backend vuelve a comprobarlo con la fila bloqueada. Es ayuda
 * para el administrador.
 */

const producto = { id: 7, name: 'Remera Nike', effective_price: 150000 };
const talleM = { id: 21, size: { id: 3, name: 'M' }, quantity: 5 };
const talleL = { id: 22, size: { id: 4, name: 'L' }, quantity: 2 };

const linea = (variant, quantity, unitPrice = 150000) =>
  buildLine({ product: producto, variant, quantity, unitPrice });

// ---------------------------------------------------------------------------
// Subtotales y total
// ---------------------------------------------------------------------------

describe('subtotales y total', () => {
  it('el subtotal es precio por cantidad', () => {
    expect(lineSubtotal(linea(talleM, 2))).toBe(300000);
  });

  it('el total es la suma de los subtotales', () => {
    const lineas = [linea(talleM, 2), linea(talleL, 1, 120000)];

    expect(saleTotal(lineas)).toBe(420000);
  });

  it('una venta sin líneas totaliza cero', () => {
    expect(saleTotal([])).toBe(0);
  });

  it('un precio de cero da subtotal cero, no un error', () => {
    expect(lineSubtotal(linea(talleM, 3, 0))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Agregar líneas
// ---------------------------------------------------------------------------

describe('agregar una línea', () => {
  it('agrega la primera línea', () => {
    const { lines, error } = addLine([], linea(talleM, 2));

    expect(error).toBeNull();
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ variantId: 21, quantity: 2, unitPrice: 150000 });
  });

  it('guarda el nombre del producto y del talle para el resumen', () => {
    const { lines } = addLine([], linea(talleM, 1));

    expect(lines[0].productName).toBe('Remera Nike');
    expect(lines[0].sizeName).toBe('M');
  });

  it('una variante sin talle se marca como tal, no se inventa un nombre', () => {
    const unica = { id: 30, size: null, quantity: 4 };
    const { lines } = addLine([], linea(unica, 1));

    expect(lines[0].sizeName).toBeNull();
  });

  it('agrega una segunda variante como línea aparte', () => {
    const primera = addLine([], linea(talleM, 2)).lines;
    const { lines } = addLine(primera, linea(talleL, 1));

    expect(lines).toHaveLength(2);
  });
});

describe('la misma variante dos veces se fusiona', () => {
  it('suma las cantidades en una sola línea', () => {
    const primera = addLine([], linea(talleM, 2)).lines;
    const { lines, error } = addLine(primera, linea(talleM, 1));

    expect(error).toBeNull();
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it('se queda con el precio de la línea nueva, que es el que se está mirando', () => {
    const primera = addLine([], linea(talleM, 1, 150000)).lines;
    const { lines } = addLine(primera, linea(talleM, 1, 99000));

    expect(lines[0].unitPrice).toBe(99000);
  });

  it('el tope se mide contra el total ya comprometido, no contra la línea suelta', () => {
    // 3 + 3 = 6 sobre un stock de 5: cada línea cabría por separado.
    const primera = addLine([], linea(talleM, 3)).lines;
    const { lines, error } = addLine(primera, linea(talleM, 3));

    expect(error).toContain('2');
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(3);
  });

  it('avisa cuando ya se agregó todo el stock', () => {
    const primera = addLine([], linea(talleM, 5)).lines;
    const { error } = addLine(primera, linea(talleM, 1));

    expect(error).toContain('todo el stock');
  });
});

describe('lo que no se acepta', () => {
  it.each([0, -1, 1.5])('rechaza la cantidad %s', (cantidad) => {
    const { lines, error } = addLine([], linea(talleM, cantidad));

    expect(error).not.toBeNull();
    expect(lines).toHaveLength(0);
  });

  it.each([-1, 1.5])('rechaza el precio %s', (precio) => {
    const { error } = addLine([], linea(talleM, 1, precio));

    expect(error).not.toBeNull();
  });

  it('rechaza una cantidad mayor al stock', () => {
    const { lines, error } = addLine([], linea(talleL, 3));

    expect(error).toContain('2');
    expect(lines).toHaveLength(0);
  });

  it('acepta exactamente el stock disponible', () => {
    const { error, lines } = addLine([], linea(talleL, 2));

    expect(error).toBeNull();
    expect(lines).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Quitar y contar
// ---------------------------------------------------------------------------

describe('quitar y contar', () => {
  it('quita la línea de esa variante y deja las demás', () => {
    const lineas = [linea(talleM, 2), linea(talleL, 1)];

    expect(removeLine(lineas, 21)).toHaveLength(1);
    expect(removeLine(lineas, 21)[0].variantId).toBe(22);
  });

  it('quitar una variante que no está no cambia nada', () => {
    const lineas = [linea(talleM, 2)];

    expect(removeLine(lineas, 999)).toHaveLength(1);
  });

  it('cuenta las unidades comprometidas de una variante', () => {
    const lineas = [linea(talleM, 2), linea(talleL, 1)];

    expect(committedQuantity(lineas, 21)).toBe(2);
    expect(committedQuantity(lineas, 999)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cuerpo de la petición
// ---------------------------------------------------------------------------

describe('el cuerpo que se manda al backend', () => {
  it('traduce cada línea al contrato de §9.19', () => {
    const lineas = [linea(talleM, 2), linea(talleL, 1, 120000)];

    expect(toRequestItems(lineas)).toEqual([
      { product_id: 7, variant_id: 21, quantity: 2, unit_price: 150000 },
      { product_id: 7, variant_id: 22, quantity: 1, unit_price: 120000 },
    ]);
  });

  it('el precio viaja siempre explícito: el total confirmado es el registrado', () => {
    const [item] = toRequestItems([linea(talleM, 1)]);

    expect(item.unit_price).toBe(150000);
  });
});

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

describe('parseEntero', () => {
  it.each([
    ['3', 3],
    ['  12  ', 12],
    ['0', 0],
  ])('acepta %s', (entrada, esperado) => {
    expect(parseEntero(entrada)).toBe(esperado);
  });

  it.each(['', '   ', '1.5', '12abc', '-3', 'abc', null, undefined, {}])(
    'rechaza %s',
    (entrada) => {
      expect(parseEntero(entrada)).toBeNull();
    },
  );

  it('no acepta "12abc" como 12, a diferencia de parseInt', () => {
    expect(Number.parseInt('12abc', 10)).toBe(12);
    expect(parseEntero('12abc')).toBeNull();
  });
});

describe('sellableVariants', () => {
  it('deja fuera las variantes sin stock', () => {
    const agotada = { id: 23, size: { name: 'XL' }, quantity: 0 };

    expect(sellableVariants([talleM, agotada, talleL])).toEqual([talleM, talleL]);
  });

  it('sin variantes devuelve una lista vacía, no revienta', () => {
    expect(sellableVariants(undefined)).toEqual([]);
    expect(sellableVariants(null)).toEqual([]);
  });
});

describe('saleErrorMessage traduce por código, nunca por el mensaje del servidor', () => {
  it('409 dice que no se registró nada', () => {
    expect(saleErrorMessage({ status: 409 })).toContain('No se registró nada');
  });

  it.each([
    [404, 'ya no existe'],
    [422, 'no es válido'],
    [429, 'Esperá'],
  ])('%s tiene su propio mensaje', (status, fragmento) => {
    expect(saleErrorMessage({ status })).toContain(fragmento);
  });

  it('un fallo de red se distingue de un rechazo', () => {
    expect(saleErrorMessage({ isNetworkFailure: true })).toContain('no se registró');
  });

  it('un error desconocido cae a un mensaje genérico', () => {
    expect(saleErrorMessage({ status: 500 })).toContain('No pudimos registrar la venta');
  });
});
