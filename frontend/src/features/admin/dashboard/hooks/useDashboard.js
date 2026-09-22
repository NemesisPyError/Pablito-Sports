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
 *
 * `tone`/`icon` (v2.9.11, rediseño visual, pedido explícito del usuario) son
 * solo de presentación — `MetricCard` los traduce a color e ícono. El
 * criterio de color es el que pidió el usuario: verde para
 * disponible/activo, ámbar para stock bajo, rojo para no disponible, el
 * acento de la marca para "en oferta", neutro para lo demás. Antes `on_sale`
 * usaba el tono `danger` de Bootstrap (rojo) solo porque era el más
 * llamativo disponible; ahora tiene su propio tono `accent`.
 */
export function buildMetricCards(totals) {
  if (!totals) return [];

  return [
    { key: 'total', label: 'Productos', value: totals.total, tone: 'neutral', icon: 'box', emphasis: true },
    { key: 'active', label: 'Activos', value: totals.active, tone: 'success', icon: 'checkCircle' },
    { key: 'hidden', label: 'Ocultos', value: totals.hidden, tone: 'neutral', icon: 'eyeOff' },
    { key: 'on_sale', label: 'En oferta', value: totals.on_sale, tone: 'accent', icon: 'tag' },
    { key: 'available', label: 'Disponibles', value: totals.available, tone: 'success', icon: 'cart' },
    { key: 'low_stock', label: 'Stock bajo', value: totals.low_stock, tone: 'warning', icon: 'alertTriangle' },
    { key: 'out_of_stock', label: 'No disponibles', value: totals.out_of_stock, tone: 'danger', icon: 'boxOff' },
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
