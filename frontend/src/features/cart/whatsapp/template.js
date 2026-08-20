/**
 * Motor de plantillas (PR-06, 02_ARQUITECTURA.md §13.8).
 *
 * Sustitución de variables y nada más: sin condicionales, sin bucles, sin
 * cálculos. La plantilla la edita el administrador desde el panel y no tiene
 * forma de depurarla.
 */

const VARIABLE = /\{\{\s*(\w+)\s*\}\}/g;

/** Variables obligatorias del mensaje (01_ANALISIS_NEGOCIO.md §12.1). */
export const REQUIRED_MESSAGE_VARIABLES = ['items', 'total'];

/**
 * Sustituye variables conocidas. Una variable desconocida no rompe: se deja
 * vacía y se reporta para la vista previa (regla 2 de §13.8).
 */
export function render(template, values) {
  const unknown = new Set();
  const text = String(template ?? '').replace(VARIABLE, (_match, name) => {
    if (!(name in values)) {
      unknown.add(name);
      return '';
    }
    const value = values[name];
    return value === null || value === undefined ? '' : String(value);
  });
  return { text, unknown: [...unknown] };
}

/** RN-60: se validan las variables obligatorias antes de guardar la plantilla. */
export function missingRequiredVariables(template) {
  const present = new Set();
  String(template ?? '').replace(VARIABLE, (_match, name) => present.add(name));
  return REQUIRED_MESSAGE_VARIABLES.filter((name) => !present.has(name));
}

/**
 * Omisión de variables sin valor (02_ARQUITECTURA.md §13.9).
 *
 * Si una variable no tiene valor, no se imprime su etiqueta vacía: la etiqueta y
 * su valor se omiten juntos. Es una regla de composición, no de plantilla, así
 * que opera sobre el texto ya renderizado: se descartan los segmentos separados
 * por `|` cuyo valor quedó vacío, y las líneas que quedan sin contenido.
 */
export function dropEmptyLabels(text) {
  return String(text)
    .split('\n')
    .map((line) => {
      if (!line.includes('|')) return line;
      const indent = line.match(/^\s*/)[0];
      const segments = line
        .split('|')
        .map((segment) => segment.trim())
        .filter((segment) => {
          const separator = segment.indexOf(':');
          if (separator === -1) return segment.length > 0;
          return segment.slice(separator + 1).trim().length > 0;
        });
      return segments.length ? indent + segments.join(' | ') : '';
    })
    .filter((line, index, lines) => {
      // Una línea que quedó completamente vacía por omisión no deja hueco.
      if (line.trim().length > 0) return true;
      return lines[index] !== '';
    })
    .join('\n');
}
