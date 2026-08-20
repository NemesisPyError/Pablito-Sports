/**
 * Imágenes adaptativas a partir de la URL canónica.
 *
 * `99_AI_DEVELOPMENT_GUIDE.md` §17.1 (`AI-06`) publica la convención: el backend
 * genera tres anchos en WebP con respaldo JPEG, nombrados
 * `<huella>-<ancho>.<formato>`. La API entrega **un solo** campo (`image_url`)
 * con el derivado canónico, y el frontend deduce los otros dos sustituyendo el
 * sufijo (§17.1.6).
 *
 * §17.1.2 fija anchos **distintos por espacio de nombres**: productos usa
 * 400/800/1600 con canónico 800, y banners 800/1600/2400 con canónico 1600,
 * *"porque una pieza de portada se muestra a ancho completo, no dentro de una
 * tarjeta"*. Deducir los de productos para un banner pedía un derivado de 400 px
 * que no existe, y el navegador recibía un 404. Marcas y tienda (v1.1.0) suman
 * sus propios conjuntos por el mismo motivo.
 *
 * Esto materializa `06_FRONTEND.md` §577 y `02_ARQUITECTURA.md` §15.7: se
 * ofrecen los tres tamaños y el navegador elige según el ancho real.
 */

// §17.1.2. Conjuntos cerrados: añadir un ancho exige actualizar §17.1 antes.
export const PRODUCT_WIDTHS = [400, 800, 1600];
export const BANNER_WIDTHS = [800, 1600, 2400];
export const BRAND_WIDTHS = [400, 800, 1600];
// La tienda usa dos anchos, no tres: tiene un solo consumidor y una vista
// previa, e inventarle un tercero sería pedir un archivo que nadie genera.
export const STORE_WIDTHS = [800, 1600];

// §17.1.6: el canónico es el **intermedio** donde hay tres anchos y el mayor
// donde hay dos.
export const PRODUCT_CANONICAL_WIDTH = 800;
export const BANNER_CANONICAL_WIDTH = 1600;
export const BRAND_CANONICAL_WIDTH = 800;
export const STORE_CANONICAL_WIDTH = 1600;

/**
 * Nombres heredados, mantenidos porque son los del espacio de productos, que es
 * el que existía antes de §17.1.2 y al que apuntan los consumidores anteriores.
 */
export const DERIVATIVE_WIDTHS = PRODUCT_WIDTHS;
export const CANONICAL_WIDTH = PRODUCT_CANONICAL_WIDTH;

// §17.1.5: la ruta es `<rama>/<espacio>[/<grupo>]/`. El espacio se lee de ahí.
const NAMESPACE_WIDTHS = [
  [/\/banners\//, BANNER_WIDTHS],
  [/\/brands\//, BRAND_WIDTHS],
  [/\/store\//, STORE_WIDTHS],
];

/**
 * Anchos que corresponden a una URL según su espacio de nombres.
 *
 * Ante la duda se asume productos: es el espacio con las rutas heredadas
 * anteriores a §17.1.2, que no llevan segmento de espacio.
 */
export function widthsFor(url) {
  const texto = String(url ?? '');
  const encontrado = NAMESPACE_WIDTHS.find(([patron]) => patron.test(texto));
  return encontrado ? encontrado[1] : PRODUCT_WIDTHS;
}

/**
 * §17.1.3: `<huella>-<ancho>.<formato>` al final de la ruta.
 *
 * El ancho se restringe al conjunto cerrado del espacio a propósito. Con `\d+`,
 * una ruta heredada como `.../botin-nike-mercurial-1.webp` encajaría —su `-1`
 * pasaría por un ancho— y se generarían URLs a derivados que no existen.
 */
function canonicalPattern(widths) {
  return new RegExp(`-(${widths.join('|')})\\.webp$`);
}

/**
 * ¿La URL sigue la convención publicada para su espacio de nombres?
 *
 * Las rutas heredadas anteriores a `AI-06` no la siguen; para ellas no se puede
 * deducir ningún otro tamaño y se sirve la imagen tal cual.
 */
export function isDerivativeUrl(url) {
  return typeof url === 'string' && canonicalPattern(widthsFor(url)).test(url);
}

/**
 * Devuelve el `srcSet` de los tres anchos del espacio, o `undefined` si no aplica.
 *
 * `undefined` es deliberado: un `srcSet` vacío o con URLs inventadas provocaría
 * peticiones a archivos inexistentes.
 */
export function buildSrcSet(url, { extension = 'webp' } = {}) {
  if (!isDerivativeUrl(url)) {
    return undefined;
  }
  const widths = widthsFor(url);
  const patron = canonicalPattern(widths);

  return widths
    .map((width) => `${url.replace(patron, `-${width}.${extension}`)} ${width}w`)
    .join(', ');
}

/**
 * `srcSet` del respaldo tradicional (§17.1.2), para el `<source>` de `<picture>`.
 */
export function buildFallbackSrcSet(url) {
  return buildSrcSet(url, { extension: 'jpg' });
}
