import { Navigate, Route, Routes } from 'react-router-dom';

import {
  AccountPage,
  AdminLayout,
  AdminNotFoundPage,
  BankFormPage,
  BanksPage,
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
  SettingsPage,
  UserFormPage,
  UsersPage,
} from '../features/admin/index.js';
import { AdminLoginPage, RequireAdminAuth, RequireSuperAdmin } from '../features/auth/index.js';

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
          <Route path="banks" element={<BanksPage />} />
          {/* `new` antes que `:id`: si no, la ruta paramétrica la capturaría. */}
          <Route path="banks/new" element={<BankFormPage />} />
          <Route path="banks/:id" element={<BankFormPage />} />
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

          {/* Configuración de la tienda (§9.12, permiso `manage_store_settings`,
              rol mínimo Administrador: no va bajo `RequireSuperAdmin`).

              v1.6.0 le quitó la ruta y el ítem de sidebar a pedido del usuario,
              dejando el código en su sitio a propósito. Vuelve porque es la
              ÚNICA pantalla que edita dirección, horarios, WhatsApp, redes y el
              texto y la foto de "Nuestra historia": sin ella esos contenidos
              solo se podían cambiar escribiendo en la base a mano. */}
          <Route path="settings" element={<SettingsPage />} />

          {/* Cualquier administrador cambia su propia contraseña (`CU-A-27`). */}
          <Route path="account" element={<AccountPage />} />

          {/* Gestión de administradores: solo Superadministrador (§8.2, `RN-67`).
              El backend impone el 403; esta guarda solo evita renderizar la
              pantalla y muestra "Sin permisos". */}
          <Route element={<RequireSuperAdmin />}>
            <Route path="users" element={<UsersPage />} />
            {/* `new` antes que `:id`: si no, la ruta paramétrica la capturaría. */}
            <Route path="users/new" element={<UserFormPage />} />
            <Route path="users/:id" element={<UserFormPage />} />
          </Route>

          {/* §8.1: una ruta `/admin/*` inexistente muestra la 404 del panel,
              dentro del layout, en vez de redirigir en silencio al Dashboard. */}
          <Route path="*" element={<AdminNotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
