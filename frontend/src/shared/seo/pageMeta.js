/**
 * Metadatos de página (06_FRONTEND.md §17).
 *
 * §17.2 acota la responsabilidad del frontend: actualizar `<title>` y
 * metaetiquetas para Google —que ejecuta JavaScript—, y gestionar las
 * canónicas. **No** genera el HTML para bots: eso son los endpoints `/_seo/*`
 * del backend (`AD-09`). Tampoco genera datos estructurados (§17.4).
 *
 * Lógica pura, sin tocar el DOM: aplicarla es cosa de `useDocumentMeta`. Así se
 * puede probar sin montar React, que es lo único que este proyecto puede
 * testear hoy.
 */

export const DEFAULT_STORE_NAME = 'Pablito Sports';

/** §17.3: rutas que no deben indexarse. */
const NEVER_INDEXED = ['/carrito', '/admin'];

/**
 * §17.3: el catálogo filtrado o paginado **no** es indexable y canonicaliza al
 * catálogo desnudo. Evita que Google trate cada combinación de filtros como una
 * página distinta con el mismo contenido.
 */
export function isFilteredCatalog(pathname, search) {
  if (pathname !== '/catalogo') return false;
  return new URLSearchParams(search ?? '').toString().length > 0;
}

/** §17.3. */
export function isIndexable(pathname, search) {
  if (NEVER_INDEXED.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))) {
    return false;
  }
  return !isFilteredCatalog(pathname, search);
}

/**
 * URL canónica absoluta (§17.3).
 *
 * Devuelve `null` donde la tabla no define canónica —carrito y panel—, porque
 * una canónica en una página que no se indexa no aporta nada.
 */
export function buildCanonical(pathname, search, origin) {
  if (NEVER_INDEXED.some((ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`))) {
    return null;
  }
  // El filtrado apunta al catálogo desnudo, no a sí mismo.
  const destino = isFilteredCatalog(pathname, search) ? '/catalogo' : pathname;
  return `${origin}${destino}`;
}

export function buildRobots(pathname, search) {
  // `follow` incluso en lo no indexable: los enlaces del carrito o de un
  // catálogo filtrado llevan a fichas que sí queremos que se rastreen.
  return isIndexable(pathname, search) ? 'index,follow' : 'noindex,follow';
}

/** Recorta una descripción al límite que los buscadores muestran. */
export function truncate(texto, maximo = 160) {
  const limpio = String(texto ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (limpio.length <= maximo) return limpio;
  // Se corta en la última palabra completa, no a mitad de una.
  return `${limpio.slice(0, maximo - 1).replace(/\s+\S*$/, '')}…`;
}

// --- Metadatos por pantalla ---------------------------------------------

export function homeMeta(storeSettings) {
  const tienda = storeSettings?.store_name || DEFAULT_STORE_NAME;
  return {
    title: `${tienda} · Indumentaria y calzado deportivo`,
    description: truncate(
      storeSettings?.address
        ? `${tienda}. Indumentaria y calzado deportivo. ${storeSettings.address}.`
        : `${tienda}. Indumentaria y calzado deportivo.`,
    ),
    ogType: 'website',
  };
}

export function catalogMeta(storeSettings, { total } = {}) {
  const tienda = storeSettings?.store_name || DEFAULT_STORE_NAME;
  return {
    title: `Catálogo · ${tienda}`,
    description: truncate(
      total
        ? `Explorá ${total} productos de indumentaria y calzado deportivo en ${tienda}.`
        : `Explorá el catálogo de indumentaria y calzado deportivo de ${tienda}.`,
    ),
    ogType: 'website',
  };
}

/**
 * Ficha de producto.
 *
 * El precio **no** entra en la descripción: cambia con las promociones (`RN-37`)
 * y quedaría desactualizado en el resultado de búsqueda hasta que Google
 * reindexe. El dato estructurado con precio lo emite el backend (§17.4).
 */
export function productMeta(product, storeSettings) {
  const tienda = storeSettings?.store_name || DEFAULT_STORE_NAME;
  if (!product) return { title: tienda, description: '', ogType: 'product' };

  const marca = product.brand?.name;
  const partes = [product.name, marca, tienda].filter(Boolean);

  return {
    title: partes.join(' · '),
    description: truncate(
      product.description || `${product.name}${marca ? ` de ${marca}` : ''} en ${tienda}.`,
    ),
    image: product.images?.[0]?.image_url ?? product.image_url ?? null,
    ogType: 'product',
  };
}

export function simplePageMeta(titulo, descripcion, storeSettings) {
  const tienda = storeSettings?.store_name || DEFAULT_STORE_NAME;
  return {
    title: `${titulo} · ${tienda}`,
    description: truncate(descripcion),
    ogType: 'website',
  };
}

/**
 * Reúne lo específico de la pantalla con lo que depende de la URL.
 *
 * `image` se absolutiza porque Open Graph exige URL absoluta: una ruta relativa
 * la ignoran tanto Facebook como Twitter.
 */
export function resolveMeta(meta, { pathname, search, origin, storeName }) {
  const canonical = buildCanonical(pathname, search, origin);
  const imagen = meta.image
    ? meta.image.startsWith('http')
      ? meta.image
      : `${origin}${meta.image}`
    : null;

  return {
    title: meta.title,
    description: meta.description,
    canonical,
    robots: buildRobots(pathname, search),
    og: {
      title: meta.title,
      description: meta.description,
      type: meta.ogType ?? 'website',
      // Sin canónica —carrito— se usa la URL real: OG describe lo que se
      // comparte, no lo que se indexa.
      url: canonical ?? `${origin}${pathname}`,
      image: imagen,
      siteName: storeName || DEFAULT_STORE_NAME,
    },
    twitter: {
      // `summary_large_image` sólo si hay imagen; si no, la tarjeta sale rota.
      card: imagen ? 'summary_large_image' : 'summary',
      title: meta.title,
      description: meta.description,
      image: imagen,
    },
  };
}
