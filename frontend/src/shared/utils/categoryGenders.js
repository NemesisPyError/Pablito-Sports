/**
 * Sexos de una categoría (`RN-83`, `AD-41`).
 *
 * Vive en `shared` y no dentro de una feature porque la misma regla la aplican
 * dos pantallas que no deben depender una de la otra: el menú de la tienda
 * (`features/store/utils/navAxes.js`) y el filtro del catálogo
 * (`features/catalog`). Duplicarla sería garantizar que tarde o temprano
 * discrepen.
 *
 * El campo llega en el árbol público (`GET /api/v1/categories`) como una lista
 * de slugs: `AD-12` prohíbe publicar identificadores.
 */

/**
 * ¿La categoría aplica a estos sexos?
 *
 * @param category Nodo del árbol; se lee `category.genders`.
 * @param gender Sexos a comparar, separados por coma (`men,unisex`), tal como
 *   viajan en la URL del catálogo y en los ejes del menú.
 *
 * Dos casos devuelven `true` sin comparar nada, y son la clave del diseño:
 * una categoría **sin sexos tildados no tiene restricción** (`AD-41`) y se
 * ofrece en todos lados, y una consulta **sin sexo** no restringe nada. Así el
 * campo nace sin efecto y solo empieza a filtrar cuando el administrador lo
 * usa.
 */
export function appliesToGender(category, gender) {
  const pedidos = String(gender ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);
  const propios = category?.genders ?? [];

  if (pedidos.length === 0 || propios.length === 0) return true;
  return propios.some((slug) => pedidos.includes(slug));
}

/**
 * Categorías raíz visibles para un sexo.
 *
 * Una raíz que no aplica sobrevive si alguna de sus hijas sí: filtrar por una
 * categoría padre incluye a sus descendientes (`AD-29`), así que esconderla
 * dejaría a esas hijas sin forma de llegar. Nunca se oculta una categoría que
 * el administrador marcó explícitamente para este sexo.
 */
export function visibleCategories(categories, gender, keepSlug = null) {
  return (categories ?? []).filter(
    (category) =>
      // La categoría que el cliente ya tiene elegida no se esconde nunca: si
      // filtra por «Botines» y después marca Mujer, sacarla de la lista dejaría
      // el desplegable en blanco mostrando productos filtrados por ella. Se
      // queda visible para que pueda verla y quitarla.
      (keepSlug != null && category.slug === keepSlug) ||
      appliesToGender(category, gender) ||
      (category.children ?? []).some((child) => appliesToGender(child, gender)),
  );
}
