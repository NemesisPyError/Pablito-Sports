/**
 * Aritmética y reglas de las líneas de una venta manual (05_API.md §9.19).
 *
 * Funciones puras, sin React y sin red: el modal decide *cuándo* se agrega una
 * línea, esto decide *qué* queda. Separarlo no es ceremonia — es lo que permite
 * probar el cálculo del total y el tope por stock sin montar el diálogo entero.
 *
 * Nada de lo que hay acá es una garantía: el backend vuelve a validar cantidad,
 * precio y stock dentro de la transacción, y es el único que puede hacerlo bien
 * porque el stock cambia mientras el modal está abierto. Esto es ayuda para el
 * administrador, no control de acceso.
 */

/** Una línea nueva a partir del producto y la variante elegidos. */
export function buildLine({ product, variant, quantity, unitPrice }) {
  return {
    productId: product.id,
    productName: product.name,
    variantId: variant.id,
    sizeName: variant.size?.name ?? null,
    availableQuantity: variant.quantity,
    quantity,
    unitPrice,
  };
}

/** El importe de una línea. Enteros: el guaraní no tiene subunidad. */
export function lineSubtotal(line) {
  return line.quantity * line.unitPrice;
}

/** El importe de la venta. */
export function saleTotal(lines) {
  return lines.reduce((suma, linea) => suma + lineSubtotal(linea), 0);
}

/** Cuántas unidades de esa variante ya están comprometidas en el borrador. */
export function committedQuantity(lines, variantId) {
  return lines
    .filter((linea) => linea.variantId === variantId)
    .reduce((suma, linea) => suma + linea.quantity, 0);
}

/**
 * Agrega una línea, **fusionando** si esa variante ya estaba.
 *
 * Dos líneas de la misma variante serían dos descuentos sobre el mismo stock, y
 * el backend las rechaza a propósito para no tener que adivinar cuál vale. Acá
 * se resuelve antes: volver a elegir la misma variante suma a la línea que ya
 * existe, que es lo que el administrador quiso decir.
 *
 * Al fusionar se conserva el precio de la línea **nueva**: es el que el
 * administrador acaba de escribir, y el que está mirando cuando pulsa Agregar.
 *
 * Devuelve `{ lines, error }`. `error` no nulo significa que no se agregó nada.
 */
export function addLine(lines, nueva) {
  if (!Number.isInteger(nueva.quantity) || nueva.quantity < 1) {
    return { lines, error: 'La cantidad debe ser un número entero mayor a cero.' };
  }
  if (!Number.isInteger(nueva.unitPrice) || nueva.unitPrice < 0) {
    return { lines, error: 'El precio debe ser un número entero de cero o más.' };
  }

  const yaComprometido = committedQuantity(lines, nueva.variantId);
  const total = yaComprometido + nueva.quantity;
  if (total > nueva.availableQuantity) {
    const restante = nueva.availableQuantity - yaComprometido;
    return {
      lines,
      error:
        restante > 0
          ? `Solo quedan ${restante} unidades disponibles de ese talle.`
          : 'Ya agregaste todo el stock disponible de ese talle.',
    };
  }

  const existente = lines.findIndex((linea) => linea.variantId === nueva.variantId);
  if (existente === -1) return { lines: [...lines, nueva], error: null };

  const fusionadas = lines.map((linea, indice) =>
    indice === existente
      ? { ...linea, quantity: linea.quantity + nueva.quantity, unitPrice: nueva.unitPrice }
      : linea,
  );
  return { lines: fusionadas, error: null };
}

/** Quita la línea de esa variante. */
export function removeLine(lines, variantId) {
  return lines.filter((linea) => linea.variantId !== variantId);
}

/** El cuerpo que espera `POST /admin/sales`. */
export function toRequestItems(lines) {
  return lines.map((linea) => ({
    product_id: linea.productId,
    variant_id: linea.variantId,
    quantity: linea.quantity,
    unit_price: linea.unitPrice,
  }));
}

/**
 * Un entero a partir de lo que haya en un `<input>`, o `null`.
 *
 * `Number.parseInt` acepta `"12abc"` como 12; acá no. Un campo con basura es un
 * campo inválido, no un 12 silencioso que después descuenta stock.
 */
export function parseEntero(valor) {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  if (!/^\d+$/.test(limpio)) return null;
  return Number.parseInt(limpio, 10);
}

/** Las variantes que se pueden vender: sin stock no hay nada que descontar. */
export function sellableVariants(variants) {
  return (variants ?? []).filter((variante) => variante.quantity > 0);
}

/** Traduce el error del backend, por código estable y nunca por su mensaje. */
export function saleErrorMessage(error) {
  if (error?.status === 409) {
    return 'No hay stock suficiente para alguna de las líneas. No se registró nada.';
  }
  if (error?.status === 404) {
    return 'Alguno de los productos o talles ya no existe. Actualizá y volvé a intentar.';
  }
  if (error?.status === 422) {
    return 'Revisá las cantidades y los precios: alguno no es válido.';
  }
  if (error?.status === 429) {
    return 'Demasiadas ventas seguidas. Esperá unos segundos.';
  }
  if (error?.isNetworkFailure) {
    return 'No pudimos conectar con el servidor. La venta no se registró.';
  }
  return 'No pudimos registrar la venta. Intentá de nuevo.';
}
