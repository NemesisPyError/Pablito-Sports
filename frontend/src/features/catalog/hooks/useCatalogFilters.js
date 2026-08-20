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
      setFilters({ ...filters, [key]: value, page: 1 });
    },
    [filters, setFilters],
  );

  const resetFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  return { filters, sortOptions: SORT_OPTIONS, updateFilter, setFilters, resetFilters };
}
