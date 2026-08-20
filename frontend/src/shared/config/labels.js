/**
 * Traducciones de presentación para valores semilla no administrables
 * (`genders`, `size_types` — `S-06`, `S-07`).
 *
 * Los slugs/ids internos NO cambian: esto es solo cómo se muestran en el
 * panel y en el catálogo. Un slug que no está en el diccionario se muestra
 * tal cual, para no ocultar un dato que el backend considera válido.
 */

export const GENDER_LABELS = {
  men: 'Hombre',
  women: 'Mujer',
  unisex: 'Unisex',
  boys: 'Niño',
  girls: 'Niña',
};

export const SIZE_TYPE_LABELS = {
  footwear_numeric: 'Calzado',
  apparel_alpha: 'Indumentaria',
  one_size: 'Talle único',
};

export function translateGender(slug) {
  return GENDER_LABELS[slug] ?? slug;
}

export function translateSizeType(slug) {
  return SIZE_TYPE_LABELS[slug] ?? slug;
}
