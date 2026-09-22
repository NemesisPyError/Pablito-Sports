import { Outlet } from 'react-router-dom';

import { ErrorState } from '../../../shared/components/ErrorState.jsx';
import { useAdminAuth } from '../hooks/useAdminAuth.js';

/**
 * Guarda de rol para las pantallas de Superadministrador (07_PANEL_ADMIN.md §8.2).
 *
 * `PA-06`: es una **conveniencia de interfaz**, no la autorización real. El
 * backend responde `403` igual si se llama al endpoint sin el rol; esto solo
 * evita renderizar una pantalla que fallaría, y muestra «Sin permisos» como
 * pide §8.2.
 *
 * Va anidada dentro de `RequireAdminAuth`, así que aquí ya hay sesión válida y
 * `administrator` está poblado: solo falta comprobar el rol.
 */
export function RequireSuperAdmin() {
  const { administrator } = useAdminAuth();

  if (administrator && administrator.role !== 'super_administrator') {
    return (
      <ErrorState
        title="Sin permisos"
        message="Esta sección es exclusiva del superadministrador."
      />
    );
  }

  return <Outlet />;
}
