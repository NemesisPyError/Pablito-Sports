import { get } from '../../../../shared/services/apiClient.js';

/**
 * Dashboard del panel (05_API.md §9.2).
 *
 * Devuelve el `DashboardDTO` de §10.8 tal cual llega. No se derivan campos ni
 * se calculan métricas: el backend ya resuelve todo lo agregado (`AD-03`), y
 * duplicar aquí un cálculo abriría la puerta a que panel y catálogo discrepen.
 */
export const dashboardApi = {
  async get() {
    const { data } = await get('/admin/dashboard');
    return data;
  },
};
