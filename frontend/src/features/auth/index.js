/**
 * Superficie pública del feature `auth` (DEP-08).
 */
export { AdminLoginPage } from './pages/AdminLoginPage.jsx';
export { RequireAdminAuth } from './components/RequireAdminAuth.jsx';
export {
  useAdminAuth,
  useAdminLogin,
  useAdminLogout,
  useUnauthorizedRedirect,
  ADMIN_SESSION_KEY,
} from './hooks/useAdminAuth.js';
export { authApi } from './api/authApi.js';
