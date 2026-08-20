/**
 * Superficie pública del feature `admin` (DEP-08).
 */
export { AdminLayout } from './layout/AdminLayout.jsx';
export { DashboardPage } from './dashboard/pages/DashboardPage.jsx';
export { useDashboard, buildMetricCards, describeMissing } from './dashboard/hooks/useDashboard.js';
export { dashboardApi } from './dashboard/api/dashboardApi.js';
export { ProductsPage } from './products/pages/ProductsPage.jsx';
export { ProductDetailPage } from './products/pages/ProductDetailPage.jsx';
export { ProductFormPage } from './products/pages/ProductFormPage.jsx';
export { adminProductsApi } from './products/api/productsApi.js';
export { PromotionsPage } from './promotions/pages/PromotionsPage.jsx';
export { PromotionFormPage } from './promotions/pages/PromotionFormPage.jsx';
export { promotionsApi } from './promotions/api/promotionsApi.js';
export { BannersPage } from './banners/pages/BannersPage.jsx';
export { BannerFormPage } from './banners/pages/BannerFormPage.jsx';
export { bannersApi } from './banners/api/bannersApi.js';
export { ClassificationsPage } from './classifications/pages/ClassificationsPage.jsx';
export { ClassificationFormPage } from './classifications/pages/ClassificationFormPage.jsx';
