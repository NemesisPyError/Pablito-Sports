import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { RouteErrorBoundary } from '../../../app/RouteErrorBoundary.jsx';
import { useAdminAuth, useAdminLogout } from '../../auth/index.js';
import { AdminContent } from './AdminContent.jsx';
import { AdminSidebar } from './AdminSidebar.jsx';
import { AdminTopbar } from './AdminTopbar.jsx';
import { useAdminTheme } from './useAdminTheme.js';
import styles from './AdminLayout.module.css';

/**
 * Layout compartido del panel (07_PANEL_ADMIN.md §5.1).
 *
 * Todo el panel se renderiza dentro de este layout. Las regiones siguen §5.2:
 * sidebar para navegar, topbar para contexto e identidad, contenido para la
 * pantalla activa.
 */
const TITULOS = {
  '/admin/dashboard': 'Dashboard',
  '/admin/products': 'Productos',
  '/admin/promotions': 'Promociones',
  '/admin/promotions/new': 'Nueva promoción',
  '/admin/users': 'Usuarios',
  '/admin/users/new': 'Nuevo usuario',
  '/admin/account': 'Mi cuenta',
};

/** El detalle lleva el identificador en la ruta, así que se resuelve por prefijo. */
function tituloDe(pathname) {
  if (TITULOS[pathname]) return TITULOS[pathname];
  if (pathname.startsWith('/admin/products/')) return 'Producto';
  if (pathname.startsWith('/admin/promotions/')) return 'Promoción';
  if (pathname.startsWith('/admin/users/')) return 'Usuario';
  return 'Panel';
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { administrator } = useAdminAuth();
  const logout = useAdminLogout();
  const { theme, toggleTheme } = useAdminTheme();

  const [sidebarAbierta, setSidebarAbierta] = useState(false);

  // Al cambiar de pantalla el drawer se cierra solo: dejarlo abierto taparía
  // la pantalla recién abierta en móvil.
  useEffect(() => {
    setSidebarAbierta(false);
  }, [location.pathname]);

  function salir() {
    logout.mutate(undefined, {
      // `onSettled`: aunque la petición falle, la sesión local ya se limpió y
      // quedarse dentro del panel sería mentir sobre el estado.
      onSettled: () => navigate('/admin/login', { replace: true }),
    });
  }

  return (
    // `data-theme` vive acá, no en `<html>`/`<body>`: es el único contenedor
    // que existe exclusivamente dentro del panel, así que la tienda pública
    // —fuera de este árbol— no puede heredar el tema oscuro.
    <div className={`${styles.shell} d-flex`} data-theme={theme}>
      <AdminSidebar open={sidebarAbierta} onNavigate={() => setSidebarAbierta(false)} />

      <div className="d-flex flex-column flex-grow-1 min-vw-0">
        <AdminTopbar
          title={tituloDe(location.pathname)}
          administrator={administrator}
          onToggleSidebar={() => setSidebarAbierta((previo) => !previo)}
          onLogout={salir}
          loggingOut={logout.isPending}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <AdminContent>
          {/* §15.2: un error de renderizado en una pantalla del panel no debe
              tumbar el resto (sidebar, topbar, navegación siguen vivos). */}
          <RouteErrorBoundary
            title="No pudimos mostrar esta pantalla"
            homeTo="/admin/dashboard"
            homeLabel="Volver al panel"
          >
            <Outlet />
          </RouteErrorBoundary>
        </AdminContent>
      </div>
    </div>
  );
}
