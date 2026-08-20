/**
 * Formato de fechas para el panel.
 *
 * Se usa `Intl` en lugar de una librería, igual que `currency.js`: el formato
 * local ya lo resuelve el navegador y no hace falta añadir nada.
 *
 * `AD-34`: las marcas viajan en UTC. `Intl` las presenta en la zona del
 * navegador, que para el panel es la de la tienda (`RN-34`).
 */
const dateTimeFormatter = new Intl.DateTimeFormat('es-PY', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('es-PY', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function parse(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Fecha y hora locales. Cadena vacía si no hay valor o no se puede interpretar. */
export function formatDateTime(value) {
  const parsed = parse(value);
  return parsed ? dateTimeFormatter.format(parsed) : '';
}

/** Solo la fecha, para cuando la hora no aporta. */
export function formatDate(value) {
  const parsed = parse(value);
  return parsed ? dateFormatter.format(parsed) : '';
}
