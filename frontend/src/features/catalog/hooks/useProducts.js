import { useQuery } from '@tanstack/react-query';

import { catalogService } from '../services/catalogService.js';

/**
 * Hook de listado de productos con filtros.
 *
 * `enabled` permite montar el hook sin lanzar la petición. Lo necesita
 * `ProductRail`, que a veces recibe el listado ya cargado —los destacados, cuya
 * cantidad decide el servidor— y no debe pedir lo mismo dos veces. El orden de
 * los hooks tiene que ser estable, así que la alternativa de no llamarlo no
 * existe.
 */
export function useProducts(filters, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: () => catalogService.getProducts(filters),
    enabled,
  });
}
