import { useQueries } from '@tanstack/react-query';

import { get } from '../../../../shared/services/apiClient.js';

/**
 * Opciones de los selectores del formulario de producto.
 *
 * Todas se leen de la **API privada**: `ProductCreateDTO` exige identificadores
 * y §4.8 los admite ahí, mientras que `AD-12` los prohíbe en la pública. Los
 * endpoints públicos identifican por slug y no servirían.
 *
 * Sexos y tipos de talle vienen de §9.17 y §9.18, que son de **solo lectura**:
 * `S-06` y `S-07` los declaran datos semilla no administrables.
 *
 * Se piden en paralelo con `useQueries`: son seis listas independientes y
 * encadenarlas multiplicaría la espera del formulario.
 */

// §4.4 acota `per_page` a 100. Las clasificaciones de una tienda caben de
// sobra; si alguna creciera más, el selector lo advertiría antes que mentir.
const PER_PAGE = 100;

const RECURSOS = [
  { clave: 'brands', ruta: '/admin/brands' },
  { clave: 'categories', ruta: '/admin/categories' },
  { clave: 'sports', ruta: '/admin/sports' },
  { clave: 'sizes', ruta: '/admin/sizes' },
  { clave: 'genders', ruta: '/admin/genders' },
  { clave: 'sizeTypes', ruta: '/admin/size-types' },
];

async function listar(ruta) {
  const { data } = await get(`${ruta}?per_page=${PER_PAGE}`);
  return data ?? [];
}

export function useClassificationOptions() {
  const consultas = useQueries({
    queries: RECURSOS.map(({ clave, ruta }) => ({
      queryKey: ['admin', 'options', clave],
      queryFn: () => listar(ruta),
      // Cambian poco y el formulario se abre a menudo.
      staleTime: 1000 * 60 * 5,
    })),
  });

  const opciones = {};
  RECURSOS.forEach(({ clave }, indice) => {
    // Sólo lo activo puede asignarse a un producto nuevo: una marca eliminada
    // sigue existiendo (`AD-18`) pero no debe ofrecerse.
    opciones[clave] = (consultas[indice].data ?? []).filter(
      (item) => item.is_active !== false && !item.deleted_at,
    );
  });

  return {
    opciones,
    isLoading: consultas.some((consulta) => consulta.isLoading),
    isError: consultas.some((consulta) => consulta.isError),
    refetch: () => consultas.forEach((consulta) => consulta.refetch()),
  };
}
