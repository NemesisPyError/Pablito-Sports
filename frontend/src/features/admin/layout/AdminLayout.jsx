import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAdminAuth, useAdminLogout } from '../../auth/index.js';
import { AdminContent } from './AdminContent.jsx';
import { AdminSidebar } from './AdminSidebar.jsx';
import { AdminTopbar } from './AdminTopbar.jsx';
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
};

/** El detalle lleva el identificador en la ruta, así que se resuelve por prefijo. */
function tituloDe(pathname) {
  if (TITULOS[pathname]) return TITULOS[pathname];
  if (pathname.startsWith('/admin/products/')) return 'Producto';
  if (pathname.startsWith('/admin/promotions/')) return 'Promoción';
  return 'Panel';
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { administrator } = useAdminAuth();
  const logout = useAdminLogout();

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
    <div className={`${styles.shell} d-flex`}>
      <AdminSidebar open={sidebarAbierta} onNavigate={() => setSidebarAbierta(false)} />

      <div className="d-flex flex-column flex-grow-1 min-vw-0">
        <AdminTopbar
          title={tituloDe(location.pathname)}
          administrator={administrator}
          onToggleSidebar={() => setSidebarAbierta((previo) => !previo)}
          onLogout={salir}
          loggingOut={logout.isPending}
        />

        <AdminContent>
          <Outlet />
        </AdminContent>
      </div>
    </div>
  );
}
