/**
 * Matemática pura del editor de recorte de banners (`BannerImageCropModal`).
 *
 * Se separa del componente por lo mismo que `heroCarouselMetrics.js`: es la
 * única lógica de ese archivo que se puede probar sin montar React, que es
 * lo único que este proyecto puede testear hoy (sin `@testing-library`).
 *
 * v2.9.4 (pedido explícito del usuario): el marco de recorte deja de forzar
 * 21:9 y pasa a respetar la proporción real de la imagen elegida.
 */

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 3;
// Techo del recorte exportado: coincide con el ancho más grande que el
// pipeline de imágenes genera para banners (`wide`, 2400px).
export const MAX_OUTPUT_WIDTH = 2400;
// Proporción de respaldo para el marco mientras la imagen todavía no cargó.
export const FALLBACK_RATIO = 16 / 9;

/**
 * Proporción real de la imagen elegida (ancho/alto). Sin tamaño natural
 * conocido todavía (la imagen no terminó de cargar), se usa un respaldo — el
 * marco nunca queda sin forma mientras se espera.
 */
export function imageRatio(naturalSize) {
  if (!naturalSize || !naturalSize.width || !naturalSize.height) return FALLBACK_RATIO;
  return naturalSize.width / naturalSize.height;
}

/**
 * Confina un desplazamiento dentro del marco: la imagen mostrada nunca deja
 * un borde vacío. Es lo que hace posible el "pan" (arrastrar) y también se
 * usa al cambiar el zoom, para que un acercamiento no saque la imagen de foco.
 */
export function clampOffset(offset, dispW, dispH, frameW, frameH) {
  const minX = frameW - dispW;
  const minY = frameH - dispH;
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

/**
 * Escala mínima para que la imagen cubra el marco por completo ("cover"),
 * sin bordes vacíos. Es la escala en `zoom = 1`; multiplicarla por el zoom da
 * la escala real de cada momento.
 */
export function coverScale(frameSize, naturalSize) {
  if (!frameSize?.width || !frameSize?.height || !naturalSize?.width || !naturalSize?.height) {
    return 0;
  }
  return Math.max(frameSize.width / naturalSize.width, frameSize.height / naturalSize.height);
}

/**
 * Rectángulo de recorte, en coordenadas de la imagen original (píxeles
 * reales, no de pantalla), a partir del marco visible, la escala y el
 * desplazamiento actuales.
 */
export function cropRect({ frameSize, scale, offset }) {
  return {
    cropW: frameSize.width / scale,
    cropH: frameSize.height / scale,
    // `|| 0` normaliza `-0`: un desplazamiento nulo debe leerse como "el
    // recorte arranca en el origen", no como un negativo cero que confunde
    // igualdades estrictas en quien consuma este valor.
    cropX: -offset.x / scale || 0,
    cropY: -offset.y / scale || 0,
  };
}

/**
 * Tamaño de salida del recorte: se deriva del rectángulo medido (`cropW`/
 * `cropH`), no de la proporción natural de la imagen — así el exportado
 * siempre coincide con lo que el administrador vio en el marco, incluso si
 * el marco quedó acotado por su alto máximo en una imagen muy vertical.
 *
 * `outW` nunca supera `cropW`: no hay upscale, el recorte nunca pide más
 * resolución de la que la imagen realmente tiene en esa zona.
 */
export function outputSize({ cropW, cropH, maxWidth = MAX_OUTPUT_WIDTH }) {
  const outW = Math.min(maxWidth, Math.round(cropW));
  const outH = Math.round(outW * (cropH / cropW));
  return { outW, outH };
}
