import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'featured', label: 'Destacados' },
];

/**
 * Sexos disponibles para el filtro del catálogo (`products.gender_id`).
 *
 * `S-06`: son datos semilla no administrables — mismo criterio que
 * `GENDER_AXES` de `navAxes.js`, que tampoco consulta `/genders` porque el
 * conjunto no puede cambiar sin una migración. A diferencia de ese eje (que
 * combina sexos en grupos comerciales), esto es 1 a 1 con cada slug real,
 * porque el filtro pide un valor exacto de `gender_id`, no un grupo.
 *
 * `group` es solo presentación (pedido explícito del usuario: Niños/Niñas
 * se ven agrupados bajo "Infantil" dentro del `<select>`, con `<optgroup>`)
 * — cada opción sigue siendo un `gender` real y seleccionable por separado,
 * no una fusión como la de `GENDER_AXES`.
 */
export const GENDER_FILTER_OPTIONS = [
  { value: 'men', label: 'Hombre' },
  { value: 'women', label: 'Mujer' },
  { value: 'boys', label: 'Niños', group: 'Infantil' },
  { value: 'girls', label: 'Niñas', group: 'Infantil' },
  { value: 'unisex', label: 'Unisex' },
];

/**
 * Agrupa opciones consecutivas del mismo `group` en secciones, para
 * `<optgroup>` (aislada del componente por lo mismo que
 * `nextFiltersAfterChange`: probarla sin montar React). Una opción sin
 * `group` es su propia sección suelta (`label: null`).
 */
export function groupGenderOptions(options) {
  const secciones = [];
  for (const opcion of options) {
    const ultima = secciones[secciones.length - 1];
    if (opcion.group && ultima?.label === opcion.group) {
      ultima.options.push(opcion);
    } else {
      secciones.push({ label: opcion.group ?? null, options: [opcion] });
    }
  }
  return secciones;
}

export const GENDER_FILTER_SECTIONS = groupGenderOptions(GENDER_FILTER_OPTIONS);

/**
 * Filtros resultantes de cambiar uno solo (aislada del hook para poder
 * probarla sin montar React ni un router).
 *
 * Cambiar un filtro cualquiera vuelve a la página 1: una selección nueva
 * invalida la posición de scroll/página anterior. Cambiar la página en sí
 * misma es la excepción — tiene que llegar a la página pedida, no volver
 * siempre a la 1 (bug real: un objeto `{ ...filters, page: value, page: 1 }`
 * deja ganar al último `page` literal sin importar `key`/`value`).
 */
export function nextFiltersAfterChange(filters, key, value) {
  const page = key === 'page' ? value : 1;
  return { ...filters, [key]: value, page };
}

/**
 * Hook para leer y escribir filtros en la URL (06_FRONTEND.md §9.2 ES-05).
 *
 * Los parámetros de consulta van en inglés; los valores son slugs (AD-23).
 */
export function useCatalogFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    return {
      q: searchParams.get('q') ?? '',
      brand: searchParams.get('brand') ?? '',
      category: searchParams.get('category') ?? '',
      gender: searchParams.get('gender') ?? '',
      sport: searchParams.get('sport') ?? '',
      size: searchParams.get('size') ?? '',
      min_price: searchParams.get('min_price') ?? '',
      max_price: searchParams.get('max_price') ?? '',
      on_sale: searchParams.get('on_sale') === 'true',
      is_new: searchParams.get('is_new') === 'true',
      is_featured: searchParams.get('is_featured') === 'true',
      sort: searchParams.get('sort') ?? 'name_asc',
      page: Number.isNaN(page) || page < 1 ? 1 : page,
      per_page: 20,
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (next) => {
      const params = new URLSearchParams();

      Object.entries(next).forEach(([key, value]) => {
        if (value === '' || value === false || value === null || value === undefined) return;
        if (key === 'page' && value === 1) return;
        if (key === 'sort' && value === 'name_asc') return;
        if (key === 'per_page') return;
        params.set(key, String(value));
      });

      setSearchParams(params, { replace: true });
    },
    [setSearchParams],
  );

  const updateFilter = useCallback(
    (key, value) => {
      setFilters(nextFiltersAfterChange(filters, key, value));
    },
    [filters, setFilters],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    sortOptions: SORT_OPTIONS,
    genderSections: GENDER_FILTER_SECTIONS,
    updateFilter,
    setFilters,
    resetFilters,
  };
}
