import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get } from '../../../../shared/services/apiClient.js';
import { DASHBOARD_KEY } from '../../dashboard/hooks/useDashboard.js';
import { promotionsApi } from '../api/promotionsApi.js';
import { getPromotionStatus, PROMOTION_STATUS } from '../utils/promotionStatus.js';

export const ADMIN_PROMOTIONS_KEY = ['admin', 'promotions'];
export const ADMIN_PROMOTION_KEY = (promotionId) => ['admin', 'promotion', promotionId];

// §9.10 no define filtros y `per_page` está acotado a 100 (§4.4). Se pide el
// máximo y se filtra en el cliente; si hubiera más, la pantalla lo avisa en
// lugar de mentir en silencio.
const PER_PAGE = 100;

/** Listado completo, sin filtrar. El filtrado ocurre en `useFilteredPromotions`. */
export function usePromotions() {
  return useQuery({
    queryKey: ADMIN_PROMOTIONS_KEY,
    queryFn: () => promotionsApi.list({ perPage: PER_PAGE }),
  });
}

/** Detalle (§9.10). `PromotionDTO`. */
export function usePromotion(promotionId) {
  return useQuery({
    queryKey: ADMIN_PROMOTION_KEY(promotionId),
    queryFn: () => promotionsApi.detail(promotionId),
    enabled: Boolean(promotionId),
  });
}

/**
 * Aplica los filtros del panel sobre el listado ya traído.
 *
 * `RN-37` permite promociones simultáneas, de modo que aquí no se descarta
 * ninguna por solaparse: solo se filtra por lo que el usuario pidió ver.
 */
export function filterPromotions(promotions, filters, now = new Date()) {
  return (promotions ?? []).filter((promocion) => {
    if (filters.status && getPromotionStatus(promocion, now) !== filters.status) return false;
    if (filters.scope && promocion.scope?.type !== filters.scope) return false;
    return true;
  });
}

export const STATUS_FILTER_OPTIONS = [
  { value: PROMOTION_STATUS.ACTIVE, label: 'Vigentes' },
  { value: PROMOTION_STATUS.SCHEDULED, label: 'Programadas' },
  { value: PROMOTION_STATUS.EXPIRED, label: 'Expiradas' },
  { value: PROMOTION_STATUS.INACTIVE, label: 'Inactivas' },
];

/**
 * Invalida lo que una escritura de promoción deja obsoleto.
 *
 * El dashboard entra porque `totals.on_sale` cuenta los productos con promoción
 * vigente (§10.8): crear, editar o eliminar una cambia ese número.
 */
function usePromotionInvalidation() {
  const queryClient = useQueryClient();

  return (promotionId) => {
    queryClient.invalidateQueries({ queryKey: ADMIN_PROMOTIONS_KEY });
    queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY });
    if (promotionId) {
      queryClient.invalidateQueries({ queryKey: ADMIN_PROMOTION_KEY(promotionId) });
    }
  };
}

/** Alta y edición comparten mutación: §10.9 define un solo juego de campos. */
export function useSavePromotion() {
  const invalidar = usePromotionInvalidation();

  return useMutation({
    mutationFn: ({ promotionId, payload }) =>
      promotionId ? promotionsApi.update(promotionId, payload) : promotionsApi.create(payload),
    onSuccess: (_data, { promotionId }) => invalidar(promotionId),
  });
}

export function useDeletePromotion() {
  const invalidar = usePromotionInvalidation();

  return useMutation({
    mutationFn: (promotionId) => promotionsApi.remove(promotionId),
    onSuccess: (_data, promotionId) => invalidar(promotionId),
  });
}

/**
 * Entidades para el selector de alcance (`RN-36`).
 *
 * Se leen de los endpoints administrativos, que son los que traen `id`: los
 * públicos identifican por `slug` conforme a `AD-12`, y el payload de la
 * promoción necesita el identificador.
 */
export function useScopeOptions(scopeType, search) {
  const brands = useQuery({
    queryKey: ['admin', 'brands', 'options'],
    queryFn: async () => (await get('/admin/brands?per_page=100')).data ?? [],
    staleTime: 1000 * 60 * 5,
    enabled: scopeType === 'brand',
  });

  const categories = useQuery({
    queryKey: ['admin', 'categories', 'options'],
    queryFn: async () => (await get('/admin/categories?per_page=100')).data ?? [],
    staleTime: 1000 * 60 * 5,
    enabled: scopeType === 'category',
  });

  // Los productos pueden ser muchos: se buscan en el servidor (§9.3 acepta `q`)
  // en lugar de traerlos todos.
  const products = useQuery({
    queryKey: ['admin', 'products', 'options', search ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: '20', sort: 'name_asc' });
      if (search) params.set('q', search);
      return (await get(`/admin/products?${params.toString()}`)).data ?? [];
    },
    enabled: scopeType === 'product',
  });

  const porTipo = { brand: brands, category: categories, product: products };
  const activa = porTipo[scopeType] ?? brands;

  return {
    options: activa.data ?? [],
    isLoading: activa.isLoading,
    isError: activa.isError,
    supportsSearch: scopeType === 'product',
  };
}
