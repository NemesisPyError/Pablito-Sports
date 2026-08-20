/**
 * Ejes comerciales de la navegación (09_COMPONENTES.md §9.8 `PublicNavbar`).
 *
 * `COMPP-06`: Hombres, Mujeres y Niños **no son categorías**. En el modelo,
 * `gender` y `category` son ejes independientes del producto; convertirlos en
 * categorías obligaría a duplicar el mismo árbol tres veces y dejaría
 * `gender_id` redundante. Acá se combinan: el eje aporta el sexo y el menú
 * aporta la categoría real.
 */

/**
 * Los sexos son datos semilla no administrables (`S-06`): la migración
 * `9a1c4e77b2d0` los fija en `men, women, unisex, boys, girls` y no existe
 * alta ni baja en el panel. Por eso los ejes se componen con esos slugs sin
 * consultar `/genders`: sería una petición en cada carga para un dato que no
 * puede cambiar. Las etiquetas son comerciales y no salen de la base —«Niños»
 * no es ningún sexo en particular, es la unión de dos—.
 */
export const GENDER_AXES = [
  { key: 'hombres', label: 'Hombres', genders: 'men,unisex' },
  { key: 'mujeres', label: 'Mujeres', genders: 'women,unisex' },
  { key: 'ninos', label: 'Niños', genders: 'boys,girls' },
];

/** Accesorios sí es una categoría real, con su propia jerarquía. */
export const ACCESSORIES_SLUG = 'accesorios';

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
export function catalogHref({ gender, category, brand, onSale, isNew } = {}) {
  const params = new URLSearchParams();

  if (gender) params.set('gender', gender);
  if (category) params.set('category', category);
  if (brand) params.set('brand', brand);
  if (onSale) params.set('on_sale', 'true');
  if (isNew) params.set('is_new', 'true');

  const query = params.toString();
  return query ? `/catalogo?${query}` : '/catalogo';
}

/**
 * Convierte el árbol de categorías en columnas del panel.
 *
 * Cada categoría raíz encabeza una columna y sus hijas cuelgan debajo. Una
 * raíz sin hijas queda como columna de un solo enlace: el panel se adapta al
 * árbol que exista, no al revés.
 */
function toGroups(categories, gender) {
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    href: catalogHref({ gender, category: category.slug }),
    items: (category.children ?? []).map((child) => ({
      slug: child.slug,
      name: child.name,
      href: catalogHref({ gender, category: child.slug }),
    })),
  }));
}

/**
 * Ejes visibles de la navegación superior.
 *
 * `Accesorios` aparece **solo si la categoría existe**: publicar un eje que
 * lleva a un listado vacío es peor que no publicarlo. Aparecerá solo en
 * cuanto se cargue la categoría desde el panel.
 */
export function buildNavAxes(categories = [], brands = []) {
  const roots = Array.isArray(categories) ? categories : [];
  const accessories = roots.find((category) => category.slug === ACCESSORIES_SLUG);
  const wearable = roots.filter((category) => category.slug !== ACCESSORIES_SLUG);

  const axes = GENDER_AXES.map((axis) => ({
    key: axis.key,
    label: axis.label,
    href: catalogHref({ gender: axis.genders }),
    groups: toGroups(wearable, axis.genders),
    brands: toBrandLinks(brands, axis.genders),
  }));

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
