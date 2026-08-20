import { useEffect } from 'react';

import { buildSrcSet } from '../utils/imageSources.js';

/**
 * Precarga la imagen principal de la pantalla (LCP).
 *
 * El banner de portada es el elemento más grande de la home, y su URL sólo se
 * conoce después de la respuesta de la API: el navegador no puede descubrirlo
 * mientras analiza el HTML. Declararlo como `preload` en cuanto se conoce
 * adelanta la descarga al momento en que React todavía está montando el árbol.
 *
 * `imagesrcset` acompaña al `srcset` real del `<picture>` (`AI-06` §17.1.6): sin
 * él, el navegador precargaría un ancho y luego descargaría otro distinto.
 */
export function usePreloadImage(url) {
  useEffect(() => {
    if (!url) return undefined;

    const enlace = document.createElement('link');
    enlace.rel = 'preload';
    enlace.as = 'image';
    enlace.href = url;
    enlace.setAttribute('fetchpriority', 'high');

    const srcSet = buildSrcSet(url);
    if (srcSet) {
      enlace.setAttribute('imagesrcset', srcSet);
      enlace.setAttribute('imagesizes', '100vw');
    }

    document.head.appendChild(enlace);
    // Se retira al desmontar: una precarga que sobrevive a su pantalla sólo
    // sirve para que el navegador advierta que el recurso no se usó.
    return () => enlace.remove();
  }, [url]);
}
