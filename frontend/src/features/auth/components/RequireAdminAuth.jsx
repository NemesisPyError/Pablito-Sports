import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { ErrorState } from '../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../shared/components/LoadingState.jsx';
import { useAdminAuth, useUnauthorizedRedirect } from '../hooks/useAdminAuth.js';

/**
 * Guardián de las rutas del panel (07_PANEL_ADMIN.md §6.1).
 *
 * `PA-06`: esto es **una conveniencia de interfaz**, no la autorización real.
 * Quien decide es el backend en cada endpoint; aquí solo se evita mostrar una
 * pantalla que fallaría de todos modos.
 */
export function RequireAdminAuth() {
  const location = useLocation();
  const { isAuthenticated, isLoading, isUnauthorized, isError, refetch } = useAdminAuth();

  useUnauthorizedRedirect();

  if (isLoading) {
    return <LoadingState message="Verificando sesión…" />;
  }

  if (isUnauthorized || !isAuthenticated) {
    // Se recuerda a dónde iba para volver ahí después de entrar.
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (isError) {
    // Un fallo de red no es una sesión inválida: mandar al login haría perder
    // la sesión buena por un corte momentáneo.
    return (
      <ErrorState
        title="No pudimos verificar la sesión"
        message="Revisá tu conexión e intentá de nuevo."
        onRetry={refetch}
      />
    );
  }

  return <Outlet />;
}
