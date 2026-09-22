import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { adminProductsApi } from '../api/productsApi.js';

export const ADMIN_PRODUCTS_KEY = ['admin', 'products'];

/** §9.3: conjunto cerrado de ordenamientos del panel. */
export const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Nombre A-Z' },
  { value: 'name_desc', label: 'Nombre Z-A' },
  { value: 'created_desc', label: 'Más recientes' },
  { value: 'updated_desc', label: 'Editados recientemente' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
];

/**
 * `RN-38b` (v1.4.0): los tres estados derivados de la cantidad cargada por
 * variante. Ya no es un campo que el administrador elija al crear/editar un
 * producto — solo se usa para el filtro del listado y para mostrar el
 * estado (de solo lectura) en la ficha.
 */
export const AVAILABILITY_OPTIONS = [
  { value: 'available', label: 'Disponible' },
  { value: 'low_stock', label: 'Stock bajo' },
  { value: 'out_of_stock', label: 'No disponible' },
];

const DEFAULTS = {
  q: '',
  brand: '',
  category: '',
  availability: '',
  is_active: '',
  sort: 'name_asc',
  page: 1,
  per_page: 20,
};

/**
 * Filtros del listado, guardados en la URL.
 *
 * Vivir en la URL hace la vista compartible y sobrevive a un refresco, que es
 * lo que se espera de un listado de trabajo.
 */
export function useAdminProductFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') ?? DEFAULTS.q,
      brand: searchParams.get('brand') ?? DEFAULTS.brand,
      category: searchParams.get('category') ?? DEFAULTS.category,
      availability: searchParams.get('availability') ?? DEFAULTS.availability,
      is_active: searchParams.get('is_active') ?? DEFAULTS.is_active,
      sort: searchParams.get('sort') ?? DEFAULTS.sort,
      page: Number.parseInt(searchParams.get('page') ?? '1', 10) || 1,
      per_page: DEFAULTS.per_page,
    }),
    [searchParams],
  );

  const setFilters = useCallback(
    (cambios) => {
      setSearchParams((previos) => {
        const siguientes = new URLSearchParams(previos);
        Object.entries(cambios).forEach(([clave, valor]) => {
          if (valor === '' || valor === null || valor === undefined || valor === false) {
            siguientes.delete(clave);
          } else {
            siguientes.set(clave, String(valor));
          }
        });
        // Cualquier cambio de criterio vuelve a la primera página: quedarse en
        // la cuarta de un resultado que ahora tiene una sola es desconcertante.
        if (!('page' in cambios)) siguientes.delete('page');
        return siguientes;
      });
    },
    [setSearchParams],
  );

  const reset = useCallback(() => setSearchParams(new URLSearchParams()), [setSearchParams]);

  const hasActiveFilters =
    Boolean(filters.q) ||
    Boolean(filters.brand) ||
    Boolean(filters.category) ||
    Boolean(filters.availability) ||
    filters.is_active !== '';

  return { filters, setFilters, reset, hasActiveFilters };
}

/** Listado paginado (§9.3). La paginación viaja en `meta` (§4.4). */
export function useAdminProducts(filters) {
  return useQuery({
    queryKey: [...ADMIN_PRODUCTS_KEY, filters],
    queryFn: () => adminProductsApi.list(filters),
    // Mantener la página anterior mientras llega la nueva evita que la tabla
    // parpadee a vacío en cada cambio de filtro.
    placeholderData: (previo) => previo,
  });
}
