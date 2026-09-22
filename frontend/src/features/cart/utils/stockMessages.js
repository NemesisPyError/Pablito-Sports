/**
 * Mensajes de límite del carrito, en un solo lugar.
 *
 * La ficha de producto y la página del carrito rechazan por los mismos motivos
 * y tienen que decir lo mismo; separarlo evita que una diga «sin stock» y la
 * otra «no disponible» para el mismo caso.
 *
 * Nunca se muestra el motivo técnico que devuelve el backend: `status` y
 * `error` son códigos internos, y lo que ve el cliente es una frase que le
 * dice qué pasó y qué puede hacer.
 */

import { CART_ERRORS } from '../stores/cartStore.js';

function unidades(cantidad) {
  return cantidad === 1 ? '1 unidad' : `${cantidad} unidades`;
}

/**
 * Frase para un rechazo del store (`addItem` / `updateQuantity`).
 *
 * @param resultado Lo que devolvió el store: `{ error, available, limit }`.
 * @param talle Nombre del talle, si se conoce, para nombrar lo que falla.
 */
export function mensajeDeRechazo(resultado, talle = null) {
  const enEsteTalle = talle ? `el talle ${talle}` : 'este talle';

  switch (resultado?.error) {
    case CART_ERRORS.TOO_MANY_ITEMS:
      return `Tu carrito admite hasta ${resultado.limit} productos distintos.`;

    case CART_ERRORS.INSUFFICIENT_STOCK:
      // Stock 0: RN-40 deja consultar igual, así que el mensaje no cierra la
      // puerta — explica que se puede preguntar, no que no se puede comprar.
      if (resultado.available === 0) {
        return `No queda stock de ${enEsteTalle}. Podés dejar una unidad en el carrito y consultarnos por disponibilidad.`;
      }
      // Sin número publicado el mensaje no lo inventa.
      if (resultado.available == null) {
        return `No hay suficiente stock para ${enEsteTalle}.`;
      }
      return `No hay suficiente stock para ${enEsteTalle}. Disponible: ${unidades(resultado.available)}.`;

    case CART_ERRORS.INVALID_QUANTITY:
      return 'Esa cantidad no es válida.';

    default:
      return 'No pudimos agregar el producto al carrito.';
  }
}

/**
 * Frase para un ítem que volvió `insufficient_stock` de la revalidación.
 *
 * El servidor es el que manda: pudo haberse vendido stock entre que el cliente
 * armó el carrito y lo revisó, así que este mensaje aparece incluso cuando el
 * límite del navegador se respetó.
 */
export function mensajeDeRevalidacion(disponible) {
  if (disponible === 0) {
    return 'Se agotó mientras estaba en tu carrito. Podés consultarnos por disponibilidad.';
  }
  if (disponible == null) {
    return 'No hay suficiente stock para la cantidad que pediste.';
  }
  return `Quedan ${unidades(disponible)} de este talle. Ajustamos la cantidad.`;
}
