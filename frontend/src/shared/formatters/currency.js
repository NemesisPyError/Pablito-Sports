/**
 * Formato de guaraníes.
 *
 * RN-23, RN-24: los precios son enteros sin decimales.
 */
const formatter = new Intl.NumberFormat('es-PY', {
  style: 'currency',
  currency: 'PYG',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatGuaranies(amount) {
  if (amount === null || amount === undefined) return '';
  return formatter.format(amount);
}
