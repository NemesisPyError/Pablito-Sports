/**
 * Configuración de las cuatro clasificaciones (05_API.md §9.5 a §9.9).
 *
 * Las cuatro comparten CRUD, contrato de salida y reglas de borrado, así que
 * comparten pantalla. Lo que las distingue —el máximo de longitud, el campo
 * propio, la dependencia que bloquea el borrado— vive aquí y no repartido por
 * los componentes.
 *
 * `maxLength` sale de §10.13 y coincide con el `VARCHAR` de 04 §9.2: el backend
 * responde `422` por encima, y avisar antes evita el viaje.
 */

export const CLASSIFICATIONS = {
  brands: {
    ruta: 'brands',
    etiqueta: 'Marcas',
    singular: 'Marca',
    articulo: 'la',
    maxLength: 100,
    // §9.6 (v1.1.0): la marca es además una pieza de la portada. Es la única
    // clasificación con logotipo, frase y orden propio; el resto son etiquetas
    // del catálogo y no se muestran en la Home.
    esPiezaDePortada: true,
    // §9.6: `409` si tiene productos asociados (`RN-68`).
    bloqueoDeBorrado: 'Tiene productos asociados.',
  },
  categories: {
    ruta: 'categories',
    etiqueta: 'Categorías',
    singular: 'Categoría',
    articulo: 'la',
    maxLength: 100,
    // `AD-24`: jerarquía de dos niveles como máximo.
    campoExtra: 'parent',
    bloqueoDeBorrado: 'Tiene productos asignados o subcategorías activas.',
    // §9.5 responde 204 al borrar, a diferencia de las otras cuatro.
    borradoSinCuerpo: true,
  },
  sports: {
    ruta: 'sports',
    etiqueta: 'Deportes',
    singular: 'Deporte',
    articulo: 'el',
    maxLength: 100,
    bloqueoDeBorrado: 'Tiene productos asociados.',
  },
  sizes: {
    ruta: 'sizes',
    etiqueta: 'Talles',
    singular: 'Talle',
    articulo: 'el',
    maxLength: 20,
    campoExtra: 'sizeType',
    bloqueoDeBorrado: 'Tiene productos o variantes asociados.',
  },
};

export function getClassification(recurso) {
  return CLASSIFICATIONS[recurso] ?? null;
}
