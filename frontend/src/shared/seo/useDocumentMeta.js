import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { resolveMeta } from './pageMeta.js';

/**
 * Aplica los metadatos de la pantalla al documento (06_FRONTEND.md §17.2).
 *
 * Sin librerías: `react-helmet` no está entre las dependencias y §17.2 sólo
 * pide actualizar `<title>`, metaetiquetas y la canónica, que es exactamente lo
 * que hace este hook.
 *
 * Las etiquetas que crea se marcan con `data-seo` para poder distinguirlas de
 * las que vengan en `index.html` y reemplazarlas sin duplicar.
 */
const MARCA = 'data-seo';

function upsertMeta(selector, atributos) {
  let elemento = document.head.querySelector(selector);
  if (!elemento) {
    elemento = document.createElement('meta');
    elemento.setAttribute(MARCA, '');
    document.head.appendChild(elemento);
  }
  Object.entries(atributos).forEach(([nombre, valor]) => elemento.setAttribute(nombre, valor));
}

function removeMeta(selector) {
  document.head.querySelector(selector)?.remove();
}

/** `name` para las estándar y de Twitter; `property` para Open Graph. */
function applyTag({ name, property, content }) {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;

  if (content === null || content === undefined || content === '') {
    removeMeta(`${selector}[${MARCA}]`);
    return;
  }
  upsertMeta(selector, name ? { name, content } : { property, content });
}

function applyCanonical(url) {
  const selector = `link[rel="canonical"]`;
  const existente = document.head.querySelector(selector);

  if (!url) {
    existente?.remove();
    return;
  }
  if (existente) {
    existente.setAttribute('href', url);
    return;
  }
  const enlace = document.createElement('link');
  enlace.setAttribute('rel', 'canonical');
  enlace.setAttribute('href', url);
  enlace.setAttribute(MARCA, '');
  document.head.appendChild(enlace);
}

/**
 * @param meta Lo específico de la pantalla: `{ title, description, image, ogType }`.
 * @param storeSettings Para `og:site_name`; opcional.
 */
export function useDocumentMeta(meta, storeSettings) {
  const { pathname, search } = useLocation();

  // `meta` suele ser un objeto literal, distinto en cada render: se depende de
  // sus campos y no de su identidad, para no reaplicar en cada pintado.
  const { title, description, image, ogType } = meta ?? {};
  const storeName = storeSettings?.store_name;

  useEffect(() => {
    if (!title) return;

    const resuelto = resolveMeta(
      { title, description, image, ogType },
      { pathname, search, origin: window.location.origin, storeName },
    );

    document.title = resuelto.title;

    applyTag({ name: 'description', content: resuelto.description });
    applyTag({ name: 'robots', content: resuelto.robots });
    applyCanonical(resuelto.canonical);

    applyTag({ property: 'og:title', content: resuelto.og.title });
    applyTag({ property: 'og:description', content: resuelto.og.description });
    applyTag({ property: 'og:type', content: resuelto.og.type });
    applyTag({ property: 'og:url', content: resuelto.og.url });
    applyTag({ property: 'og:image', content: resuelto.og.image });
    applyTag({ property: 'og:site_name', content: resuelto.og.siteName });

    applyTag({ name: 'twitter:card', content: resuelto.twitter.card });
    applyTag({ name: 'twitter:title', content: resuelto.twitter.title });
    applyTag({ name: 'twitter:description', content: resuelto.twitter.description });
    applyTag({ name: 'twitter:image', content: resuelto.twitter.image });
  }, [title, description, image, ogType, pathname, search, storeName]);
}
