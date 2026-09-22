/**
 * Enlaces que vienen de la base de datos, saneados antes de navegar.
 *
 * El backend acota la **longitud** de `link_url`, no el esquema (05_API.md
 * §10.13). Cualquier valor que un administrador haya guardado —hoy, o antes de
 * que el formulario validara— llega tal cual al catálogo, así que el destino se
 * decide acá y no en el punto de render.
 *
 * Qué se admite, y nada más:
 *
 *   · una ruta interna: `/catalogo`, `/producto/zapatilla-x`;
 *   · una URL absoluta `http:` o `https:`.
 *
 * Todo lo demás devuelve `null` y quien llama cae a su alternativa. Eso incluye
 * `javascript:` —el que convierte un enlace en ejecución de código—, `data:`,
 * `vbscript:`, `file:` y cualquier esquema futuro que no sea de navegación web.
 *
 * Dos casos que parecen inofensivos y no lo son:
 *
 *   · `//evil.example` es **protocol-relative**: el navegador lo resuelve como
 *     `https://evil.example`. Parece una ruta interna porque empieza con `/`.
 *   · `/\evil.example`: varios navegadores tratan la barra invertida como si
 *     fuera una barra normal, de modo que también termina saliendo del sitio.
 *
 * Los caracteres de control se rechazan porque permiten partir el esquema y
 * esquivar una comparación literal.
 */

/**
 * ¿El texto lleva algún carácter de control (rango C0 o DEL)?
 *
 * Se comprueba recorriendo los códigos y no con una expresión regular: ESLint
 * prohíbe los caracteres de control dentro de un regex (`no-control-regex`) —con
 * razón, porque escritos como escapes son invisibles al leer— y silenciar la
 * regla para esta línea escondería justo lo que hay que ver.
 */
function tieneControl(texto) {
  for (const caracter of texto) {
    const codigo = caracter.codePointAt(0);
    if (codigo < 0x20 || codigo === 0x7f) return true;
  }
  return false;
}

const ESQUEMAS_DE_NAVEGACION = new Set(['http:', 'https:']);

/** Texto aprovechable, o `null`. No se asume que la entrada sea una cadena. */
function normalizar(valor) {
  if (typeof valor !== 'string') return null;
  const enlace = valor.trim();
  if (!enlace) return null;
  return tieneControl(enlace) ? null : enlace;
}

/** La URL absoluta si su esquema es de navegación web; si no, `null`. */
function absolutaSegura(enlace) {
  try {
    const url = new URL(enlace);
    return ESQUEMAS_DE_NAVEGACION.has(url.protocol) ? enlace : null;
  } catch {
    // No es una URL absoluta: no se inventa un destino.
    return null;
  }
}

/**
 * Devuelve el enlace utilizable, o `null` si no se puede navegar a él con
 * seguridad. Admite **ruta interna o URL absoluta**: es lo que consume el
 * `Link` del router para una pieza de portada.
 *
 * @param {unknown} valor Lo que venga en `link_url`; no se asume que sea texto.
 * @returns {string | null}
 */
export function safeHref(valor) {
  const enlace = normalizar(valor);
  if (enlace === null) return null;

  // Ruta interna. Se descarta antes lo que sólo aparenta serlo.
  if (enlace.startsWith('/')) {
    if (enlace.startsWith('//')) return null;
    if (enlace.startsWith('/\\')) return null;
    return enlace;
  }

  return absolutaSegura(enlace);
}

/**
 * Igual que `safeHref`, pero **sin** rutas internas: sólo una URL absoluta
 * `http(s)`.
 *
 * Es lo que necesita un enlace que se abre hacia afuera —una red social—, donde
 * una ruta interna no sería un error de esquema sino un destino equivocado.
 *
 * @param {unknown} valor
 * @returns {string | null}
 */
export function safeExternalHref(valor) {
  const enlace = normalizar(valor);
  return enlace === null ? null : absolutaSegura(enlace);
}
