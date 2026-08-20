import { useQuery } from '@tanstack/react-query';

import { dashboardApi } from '../api/dashboardApi.js';

export const DASHBOARD_KEY = ['admin', 'dashboard'];

/**
 * Datos del dashboard (05_API.md §9.2).
 *
 * Ventana de frescura corta: es una pantalla de resumen que se abre al entrar
 * al panel y cuyo valor está en reflejar el estado actual del catálogo.
 */
export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: () => dashboardApi.get(),
    staleTime: 1000 * 30,
  });
}

/**
 * Las siete tarjetas de `RF-38`, en el orden en que se leen.
 *
 * Los datos vienen ya calculados de `totals` (§10.8); esto solo decide cómo se
 * llaman y cómo se agrupan visualmente. **No** deriva métricas nuevas.
 * v1.4.0 (`RN-38b`): se retira "Próximamente" (`coming_soon`, estado eliminado).
 */
export function buildMetricCards(totals) {
  if (!totals) return [];

  return [
    { key: 'total', label: 'Productos', value: totals.total, tone: 'primary', emphasis: true },
    { key: 'active', label: 'Activos', value: totals.active, tone: 'success' },
    { key: 'hidden', label: 'Ocultos', value: totals.hidden, tone: 'secondary' },
    { key: 'on_sale', label: 'En oferta', value: totals.on_sale, tone: 'danger' },
    { key: 'available', label: 'Disponibles', value: totals.available, tone: 'success' },
    { key: 'low_stock', label: 'Stock bajo', value: totals.low_stock, tone: 'warning' },
    { key: 'out_of_stock', label: 'No disponibles', value: totals.out_of_stock, tone: 'secondary' },
  ];
}

/** Etiquetas de `incomplete_products[].missing` (`RF-39`). */
const ETIQUETAS_FALTANTES = {
  image: 'Sin imagen',
  price: 'Sin precio',
  category: 'Sin categoría',
};

export function describeMissing(missing) {
  if (!Array.isArray(missing)) return [];
  // Un código desconocido se muestra tal cual antes que desaparecer: si el
  // contrato creciera, la pantalla lo delata en vez de ocultarlo.
  return missing.map((codigo) => ETIQUETAS_FALTANTES[codigo] ?? codigo);
}
