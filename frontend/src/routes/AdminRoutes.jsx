import { Navigate, Route, Routes } from 'react-router-dom';

import {
  AdminLayout,
  BannerFormPage,
  BannersPage,
  ClassificationFormPage,
  ClassificationsPage,
  DashboardPage,
  ProductDetailPage,
  ProductFormPage,
  ProductsPage,
  PromotionFormPage,
  PromotionsPage,
} from '../features/admin/index.js';
import { AdminLoginPage, RequireAdminAuth } from '../features/auth/index.js';

// Las rutas coinciden con el recurso de la API (§9.5 a §9.9).
const CLASIFICACIONES = ['brands', 'categories', 'sports', 'sizes'];

/**
 * Rutas del panel administrativo (07_PANEL_ADMIN.md §12).
 *
 * `/admin/login` queda **fuera** del guardián: es la única pantalla del panel
 * accesible sin sesión, y protegerla produciría un bucle de redirecciones.
 *
 * El dashboard es la ruta por defecto: §14.1 lo define como la vista de entrada
 * al panel.
 */
export function AdminRoutes() {
  return (
    <Routes>
      <Route path="login" element={<AdminLoginPage />} />

      <Route element={<RequireAdminAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          {/* `new` antes que `:id`: si no, la ruta paramétrica la capturaría. */}
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="products/:id/edit" element={<ProductFormPage />} />
          <Route path="promotions" element={<PromotionsPage />} />
          <Route path="promotions/new" element={<PromotionFormPage />} />
          <Route path="promotions/:id" element={<PromotionFormPage />} />
          <Route path="banners" element={<BannersPage />} />
          {/* `new` antes que `:id`: si no, la ruta paramétrica la capturaría. */}
          <Route path="banners/new" element={<BannerFormPage />} />
          <Route path="banners/:id" element={<BannerFormPage />} />
          {/* §9.5 a §9.9: las cinco clasificaciones comparten pantalla, así
              que comparten elemento y se distinguen por `:recurso`. Se declaran
              una a una porque React Router 6 no admite restringir un parámetro
              con una expresión: `:recurso(a|b)` se tomaría literalmente. */}
          {CLASIFICACIONES.map((recurso) => (
            <Route key={recurso} path={recurso}>
              <Route index element={<ClassificationsPage recurso={recurso} />} />
              {/* `new` antes que `:id`: si no, la paramétrica lo capturaría. */}
              <Route path="new" element={<ClassificationFormPage recurso={recurso} />} />
              <Route path=":id" element={<ClassificationFormPage recurso={recurso} />} />
            </Route>
          ))}
        </Route>
      </Route>

      {/* Una ruta desconocida del panel vuelve a su entrada, no al catálogo. */}
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
    </Routes>
  );
}
