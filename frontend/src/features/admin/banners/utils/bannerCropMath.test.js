import { describe, expect, it } from 'vitest';

import {
  clampOffset,
  coverScale,
  cropRect,
  FALLBACK_RATIO,
  imageRatio,
  MAX_OUTPUT_WIDTH,
  outputSize,
} from './bannerCropMath.js';

describe('imageRatio', () => {
  it('imagen panorámica: conserva su proporción real, no 21:9 forzado', () => {
    // 2400x1000 no es 21:9 (2.333) exacto, es un panorámico cualquiera —
    // exactamente el caso que antes se forzaba a 21/9 = 2.333.
    expect(imageRatio({ width: 2400, height: 1000 })).toBeCloseTo(2.4);
  });

  it('imagen vertical: proporción menor a 1, se conserva', () => {
    expect(imageRatio({ width: 900, height: 1600 })).toBeCloseTo(0.5625);
  });

  it('imagen cuadrada: proporción exactamente 1', () => {
    expect(imageRatio({ width: 1200, height: 1200 })).toBe(1);
  });

  it('sin tamaño natural todavía, usa el respaldo — nunca queda sin forma', () => {
    expect(imageRatio(null)).toBe(FALLBACK_RATIO);
    expect(imageRatio({ width: 0, height: 0 })).toBe(FALLBACK_RATIO);
  });
});

describe('clampOffset — pan', () => {
  it('un desplazamiento dentro de los límites no se toca', () => {
    const offset = clampOffset({ x: -50, y: -20 }, 800, 600, 700, 500);
    expect(offset).toEqual({ x: -50, y: -20 });
  });

  it('no deja arrastrar más allá del borde derecho/inferior de la imagen', () => {
    // dispW=800 en un marco de 700: el mínimo x es 700-800=-100.
    const offset = clampOffset({ x: 50, y: 50 }, 800, 600, 700, 500);
    expect(offset).toEqual({ x: 0, y: 0 });
  });

  it('no deja arrastrar más allá del borde izquierdo/superior', () => {
    const offset = clampOffset({ x: -500, y: -400 }, 800, 600, 700, 500);
    expect(offset).toEqual({ x: -100, y: -100 });
  });
});

describe('coverScale', () => {
  it('cubre el marco por el lado que necesita más escala', () => {
    // marco 700x500, imagen 1400x1000 (misma proporción): escala 0.5 en los dos ejes.
    expect(coverScale({ width: 700, height: 500 }, { width: 1400, height: 1000 })).toBeCloseTo(0.5);
  });

  it('imagen vertical en marco panorámico: la escala la fija el ancho del marco', () => {
    const escala = coverScale({ width: 1000, height: 300 }, { width: 900, height: 1600 });
    // Cubrir el ancho del marco (1000/900 ≈ 1.11) exige más escala que cubrir
    // su alto (300/1600 ≈ 0.19): "cover" siempre toma la mayor de las dos.
    expect(escala).toBeCloseTo(1000 / 900);
  });

  it('sin tamaños conocidos, no divide por cero', () => {
    expect(coverScale({ width: 0, height: 0 }, { width: 100, height: 100 })).toBe(0);
    expect(coverScale(null, { width: 100, height: 100 })).toBe(0);
  });
});

describe('cropRect', () => {
  it('sin desplazamiento, el recorte arranca en el origen de la imagen', () => {
    const rect = cropRect({ frameSize: { width: 700, height: 500 }, scale: 0.5, offset: { x: 0, y: 0 } });
    expect(rect).toEqual({ cropW: 1400, cropH: 1000, cropX: 0, cropY: 0 });
  });

  it('un desplazamiento negativo (arrastre hacia la izquierda) mueve el origen del recorte', () => {
    const rect = cropRect({
      frameSize: { width: 700, height: 500 },
      scale: 0.5,
      offset: { x: -100, y: -50 },
    });
    expect(rect.cropX).toBe(200);
    expect(rect.cropY).toBe(100);
  });
});

describe('outputSize — modo Recortar', () => {
  it('conserva la proporción del recorte medido, no un valor fijo', () => {
    const { outW, outH } = outputSize({ cropW: 1000, cropH: 1000 });
    expect(outW / outH).toBeCloseTo(1); // cuadrado
  });

  it('imagen vertical: la salida mantiene esa forma', () => {
    const { outW, outH } = outputSize({ cropW: 900, cropH: 1600 });
    expect(outW / outH).toBeCloseTo(900 / 1600);
  });

  it('imagen panorámica: la salida mantiene esa forma, no 21:9', () => {
    const { outW, outH } = outputSize({ cropW: 2400, cropH: 1000 });
    expect(outW / outH).toBeCloseTo(2.4);
  });

  it('nunca hace upscale: el ancho de salida no supera el del recorte real', () => {
    const { outW } = outputSize({ cropW: 500, cropH: 500 });
    expect(outW).toBeLessThanOrEqual(500);
  });

  it('respeta el techo de 2400px del pipeline de banners', () => {
    const { outW } = outputSize({ cropW: 5000, cropH: 5000 });
    expect(outW).toBe(MAX_OUTPUT_WIDTH);
  });
});
