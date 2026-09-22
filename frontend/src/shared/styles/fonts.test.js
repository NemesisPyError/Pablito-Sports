import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Las tipografías se alojan en el propio sitio (UDSP-01, 03_SEGURIDAD.md §12).
 *
 * La regresión que fija esta suite: mientras `index.html` cargaba Archivo desde
 * `fonts.googleapis.com`, la Content-Security-Policy de producción declaraba
 * `style-src 'self'` y `font-src 'self'`. Ninguno de los dos orígenes estaba
 * permitido, así que en el primer despliegue la hoja y los archivos de fuente
 * habrían quedado bloqueados y la tipografía habría caído a la del sistema —en
 * silencio, sin error visible para quien desplegara—.
 *
 * Volver a enlazar una fuente externa reintroduce exactamente ese fallo, y no
 * se notaría en desarrollo porque ahí no hay CSP. Estos tests lo detectan antes.
 *
 * La CSP vive en `nginx/prod/default.conf.template`, fuera de lo que el
 * contenedor de frontend puede leer: lo que se comprueba acá es la mitad que sí
 * está a mano —que el frontend no necesita ningún origen externo—, que es la
 * que puede cambiar por descuido al editar una plantilla o un estilo.
 */

// Desde `import.meta.url` y no desde `process.cwd()`: el segundo es un global
// de Node que la configuración de ESLint no declara, y esto no lo necesita —la
// raíz del frontend está tres niveles por encima de este archivo.
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const FUENTES = join(RAIZ, 'public', 'fonts');
const CSS_FUENTES = join(RAIZ, 'src', 'shared', 'styles', 'fonts.css');

/** Orígenes que la CSP de producción NO permite. */
const ORIGENES_PROHIBIDOS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'use.typekit.net',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
];

function leer(ruta) {
  return readFileSync(ruta, 'utf8');
}

/** Todos los estilos del proyecto, sin `node_modules` ni el build. */
function archivosCss(directorio = join(RAIZ, 'src')) {
  const salida = [];
  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) salida.push(...archivosCss(ruta));
    else if (entrada.name.endsWith('.css')) salida.push(ruta);
  }
  return salida;
}

describe('el frontend no depende de ningún origen externo para sus fuentes', () => {
  it('index.html no enlaza hojas ni fuentes de terceros', () => {
    const html = leer(join(RAIZ, 'index.html'));
    // Se miran solo los atributos que cargan algo. Un comentario que nombre el
    // dominio para explicar por qué NO se usa no es una dependencia.
    const cargas = [...html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)].map((m) => m[1]);

    const externas = cargas.filter((url) => /^https?:\/\//.test(url));
    expect(externas).toEqual([]);
  });

  it('ninguna hoja de estilo apunta a un origen prohibido por la CSP', () => {
    for (const ruta of archivosCss()) {
      const css = leer(ruta);
      // `url(...)` y `@import` son las dos formas de traer algo desde CSS.
      const referencias = [
        ...[...css.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1]),
        ...[...css.matchAll(/@import\s+['"]([^'"]+)/g)].map((m) => m[1]),
      ];
      for (const referencia of referencias) {
        for (const prohibido of ORIGENES_PROHIBIDOS) {
          expect(referencia, `${ruta} referencia ${prohibido}`).not.toContain(prohibido);
        }
      }
    }
  });

  it('las fuentes se sirven desde el propio sitio', () => {
    const css = leer(CSS_FUENTES);
    const fuentes = [...css.matchAll(/url\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);

    expect(fuentes.length).toBe(6);
    for (const ruta of fuentes) {
      // Ruta absoluta del propio origen: lo que `font-src 'self'` permite.
      expect(ruta.startsWith('/fonts/')).toBe(true);
    }
  });
});

describe('los archivos de fuente están realmente presentes', () => {
  it('existen los seis woff2 que declara fonts.css', () => {
    const css = leer(CSS_FUENTES);
    const rutas = [...css.matchAll(/url\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]);

    for (const ruta of rutas) {
      const archivo = join(FUENTES, ruta.replace('/fonts/', ''));
      expect(existsSync(archivo), `falta ${ruta}`).toBe(true);
    }
  });

  it('son woff2 de verdad, no marcadores vacíos', () => {
    for (const nombre of readdirSync(FUENTES).filter((n) => n.endsWith('.woff2'))) {
      const datos = readFileSync(join(FUENTES, nombre));
      // Firma del formato: sin esto el navegador descarta el archivo y la
      // tipografía cae a la del sistema sin decir nada.
      expect(datos.subarray(0, 4).toString('latin1'), nombre).toBe('wOF2');
      expect(datos.length).toBeGreaterThan(1024);
    }
  });

  it('se distribuye la licencia OFL junto a las fuentes', () => {
    // La SIL Open Font License obliga a acompañar la fuente con su licencia.
    const licencia = leer(join(FUENTES, 'OFL.txt'));
    expect(licencia).toContain('SIL Open Font License');
  });
});

describe('fonts.css conserva las familias y los pesos que el diseño usa', () => {
  it('declara Archivo y Archivo Narrow', () => {
    const css = leer(CSS_FUENTES);
    const familias = new Set(
      [...css.matchAll(/font-family:\s*'([^']+)'/g)].map((m) => m[1]),
    );

    expect(familias).toEqual(new Set(['Archivo', 'Archivo Narrow']));
  });

  it('mantiene los rangos de peso originales, sin ampliarlos', () => {
    // Los mismos que pedía el enlace anterior: Archivo 400–800, Narrow 400–700.
    const css = leer(CSS_FUENTES);
    const pesos = new Set([...css.matchAll(/font-weight:\s*([^;]+);/g)].map((m) => m[1].trim()));

    expect(pesos).toEqual(new Set(['400 800', '400 700']));
  });

  it('usa font-display: swap, como el enlace que reemplaza', () => {
    const css = leer(CSS_FUENTES);
    // Con `;`: la prosa del encabezado también nombra la propiedad.
    const swaps = [...css.matchAll(/font-display:\s*swap;/g)];

    // Uno por bloque: el texto se lee desde el primer instante.
    expect(swaps.length).toBe(6);
  });

  it('los tokens siguen nombrando la familia que se aloja', () => {
    const tokens = leer(join(RAIZ, 'src', 'shared', 'styles', 'tokens.css'));

    expect(tokens).toContain("'Archivo'");
    expect(tokens).toContain("'Archivo Narrow'");
  });
});
