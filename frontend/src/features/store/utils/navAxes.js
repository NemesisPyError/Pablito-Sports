/**
 * Ejes comerciales de la navegación (09_COMPONENTES.md §9.8 `PublicNavbar`).
 *
 * `COMPP-06`: Hombres, Mujeres e Infantil **no son categorías**. En el modelo,
 * `gender` y `category` son ejes independientes del producto; convertirlos en
 * categorías obligaría a duplicar el mismo árbol tres veces y dejaría
 * `gender_id` redundante. Acá se combinan: el eje aporta el sexo y el menú
 * aporta la categoría real.
 *
 * `RN-83` (v2.10.0): qué categorías entran en cada eje ya no es una lista de
 * slugs escrita acá, sino un campo del panel. La regla vive en
 * `shared/utils/categoryGenders.js` porque el filtro del catálogo aplica la
 * misma.
 */

import { appliesToGender } from '../../../shared/utils/categoryGenders.js';

/**
 * Los sexos son datos semilla no administrables (`S-06`): la migración
 * `9a1c4e77b2d0` los fija en `men, women, unisex, boys, girls` y no existe
 * alta ni baja en el panel. Por eso los ejes se componen con esos slugs sin
 * consultar `/genders`: sería una petición en cada carga para un dato que no
 * puede cambiar. Las etiquetas son comerciales y no salen de la base —«Infantil»
 * no es ningún sexo en particular, es la unión de dos—.
 */
export const GENDER_AXES = [
  { key: 'hombres', label: 'Hombres', genders: 'men,unisex' },
  { key: 'mujeres', label: 'Mujeres', genders: 'women,unisex' },
  { key: 'ninos', label: 'Infantil', genders: 'boys,girls' },
];

/** Accesorios sí es una categoría real, con su propia jerarquía. */
export const ACCESSORIES_SLUG = 'accesorios';

/**
 * Categoría real `deportes` (v2.9.1): el panel puede tener una categoría de
 * producto con este slug/nombre, distinta de la entidad `Sport` que alimenta
 * el eje `DEPORTES` del navbar. Si se dejara pasar como una raíz más de
 * `wearable`, aparecería duplicada como subcategoría dentro de Hombres,
 * Mujeres e Infantil, compitiendo visualmente con el eje independiente. Se
 * excluye de los árboles de sexo con el mismo criterio que `accesorios`; la
 * categoría en sí no se borra ni deja de existir, solo no se anida ahí.
 */
export const SPORTS_CATEGORY_SLUG = 'deportes';

/**
 * Marcas dentro de cada eje de sexo (v1.4.0, `09_COMPONENTES.md` §9.8
 * `MegaMenu`). Es la misma lista completa en los tres ejes — las marcas no
 * tienen sexo propio en el modelo, el filtro de sexo lo aporta el eje.
 */
function toBrandLinks(brands, gender) {
  return (brands ?? []).map((brand) => ({
    slug: brand.slug,
    name: brand.name,
    imageUrl: brand.image_url,
    href: catalogHref({ gender, brand: brand.slug }),
  }));
}

/** Construye la URL del catálogo con los filtros que el catálogo ya acepta. */
export function catalogHref({ gender, category, brand, sport, onSale, isNew } = {}) {
  const params = new URLSearchParams();

  if (gender) params.set('gender', gender);
  if (category) params.set('category', category);
  if (brand) params.set('brand', brand);
  if (sport) params.set('sport', sport);
  if (onSale) params.set('on_sale', 'true');
  if (isNew) params.set('is_new', 'true');

  const query = params.toString();
  return query ? `/catalogo?${query}` : '/catalogo';
}

/**
 * Eje `DEPORTES` (v2.8.0): a diferencia de los ejes de sexo, no combina con
 * categorías ni marcas — lista los deportes reales como enlaces planos, sin
 * jerarquía, porque `Sport` no tiene subcategoría propia.
 */
function toSportGroups(sports) {
  return (sports ?? []).map((sport) => ({
    slug: sport.slug,
    name: sport.name,
    href: catalogHref({ sport: sport.slug }),
    items: [],
  }));
}

/**
 * Convierte el árbol de categorías en columnas del panel.
 *
 * Cada categoría raíz encabeza una columna y sus hijas cuelgan debajo. Una
 * raíz sin hijas queda como columna de un solo enlace: el panel se adapta al
 * árbol que exista, no al revés.
 *
 * `RN-83`: las hijas se filtran por sexo dentro de la columna, y la columna
 * desaparece si no queda nada que ofrecer. Una raíz que no aplica al eje
 * igual sobrevive si alguna hija suya sí aplica —«Indumentaria» sin sexos
 * tildados podría no tener sentido en Infantil, pero su hija «Conjuntos de
 * niño» sí—: nunca se esconde una categoría que el administrador marcó
 * explícitamente para este eje.
 */
function toGroups(categories, gender) {
  const columnas = [];

  for (const category of categories) {
    const hijas = (category.children ?? []).filter((child) => appliesToGender(child, gender));
    // La raíz que no aplica solo se muestra como encabezado de sus hijas: si
    // tampoco queda ninguna, no hay nada que ofrecer y la columna se va.
    if (!appliesToGender(category, gender) && hijas.length === 0) continue;

    columnas.push({
      slug: category.slug,
      name: category.name,
      href: catalogHref({ gender, category: category.slug }),
      items: hijas.map((child) => ({
        slug: child.slug,
        name: child.name,
        href: catalogHref({ gender, category: child.slug }),
      })),
    });
  }

  return columnas;
}

/**
 * Ejes visibles de la navegación superior.
 *
 * `Accesorios` aparece **solo si la categoría existe**: publicar un eje que
 * lleva a un listado vacío es peor que no publicarlo. Aparecerá solo en
 * cuanto se cargue la categoría desde el panel.
 */
export function buildNavAxes(categories = [], brands = [], sports = []) {
  const roots = Array.isArray(categories) ? categories : [];
  const accessories = roots.find((category) => category.slug === ACCESSORIES_SLUG);
  const wearable = roots.filter(
    (category) => category.slug !== ACCESSORIES_SLUG && category.slug !== SPORTS_CATEGORY_SLUG,
  );

  const axes = GENDER_AXES.map((axis) => ({
    key: axis.key,
    label: axis.label,
    href: catalogHref({ gender: axis.genders }),
    groups: toGroups(wearable, axis.genders),
    brands: toBrandLinks(brands, axis.genders),
  }));

  axes.push({
    key: 'deportes',
    label: 'Deportes',
    href: catalogHref(),
    groups: toSportGroups(sports),
  });

  if (accessories) {
    axes.push({
      key: ACCESSORIES_SLUG,
      label: accessories.name,
      href: catalogHref({ category: accessories.slug }),
      groups: toGroups(accessories.children ?? []),
    });
  }

  // `is_new` y `on_sale` son marcas que el administrador decide producto por
  // producto (RN-38, DN-03): estos dos ejes no despliegan panel porque no hay
  // subcategoría que ofrecer, llevan directo al listado filtrado.
  axes.push({
    key: 'novedades',
    label: 'Novedades',
    href: catalogHref({ isNew: true }),
    groups: [],
  });

  axes.push({
    key: 'promociones',
    label: 'Promociones',
    href: catalogHref({ onSale: true }),
    groups: [],
    accent: true,
  });

  return axes;
}
