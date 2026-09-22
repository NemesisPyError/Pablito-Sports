import { NavLink } from 'react-router-dom';

import { useAdminAuth } from '../../auth/index.js';
import { AdminIcon } from './AdminIcon.jsx';
import styles from './AdminLayout.module.css';

/**
 * Navegación principal del panel (07_PANEL_ADMIN.md §5.1, §5.2).
 *
 * §5.2: la sidebar muestra el menú e indica la ruta activa. **No** carga datos
 * ni ejecuta lógica de dominio.
 *
 * §12 fija el árbol de navegación completo. Aquí solo figuran los módulos con
 * pantalla implementada; los demás se irán habilitando en sus propias tandas,
 * porque un enlace a una ruta que no existe es peor que no tenerlo.
 *
 * v2.9.11 (rediseño visual, pedido explícito del usuario): los glifos Unicode
 * pasan a `AdminIcon` (SVG en línea) y el ítem activo se destaca con el
 * acento azul del proyecto (`--color-volt-500`, ya usado en el catálogo
 * público), no un color nuevo.
 *
 * v1.6.0 retiró "Configuración" del menú a pedido del usuario, sin borrar la
 * pantalla. Vuelve porque era la única forma de editar dirección, horarios,
 * WhatsApp, redes y el texto y la foto de "Nuestra historia" (§14.7): mientras
 * no estuvo, la página pública "Nosotros" invitaba a editarla desde un lugar
 * del panel que no existía.
 *
 * "Usuarios" (07_PANEL_ADMIN.md §8.2, `RN-67`) solo se muestra al
 * Superadministrador: `superOnly` lo filtra según el rol de la sesión. Un
 * Administrador no ve el ítem, y si entra a mano a `/admin/users` el backend
 * responde `403` y la guarda de ruta muestra "Sin permisos" (§8.2).
 */
const SECCIONES = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/products', label: 'Productos', icon: 'products' },
  { to: '/admin/categories', label: 'Categorías', icon: 'categories' },
  { to: '/admin/brands', label: 'Marcas', icon: 'brands' },
  { to: '/admin/sports', label: 'Deportes', icon: 'sports' },
  { to: '/admin/sizes', label: 'Talles', icon: 'sizes' },
  { to: '/admin/promotions', label: 'Promociones', icon: 'promotions' },
  { to: '/admin/banners', label: 'Banners', icon: 'banners' },
  { to: '/admin/banks', label: 'Bancos', icon: 'banks' },
  { to: '/admin/settings', label: 'Configuración', icon: 'settings' },
  { to: '/admin/users', label: 'Usuarios', icon: 'users', superOnly: true },
];

export function AdminSidebar({ open, onNavigate }) {
  const { administrator } = useAdminAuth();
  const esSuper = administrator?.role === 'super_administrator';
  const secciones = SECCIONES.filter((seccion) => !seccion.superOnly || esSuper);

  return (
    <>
      {/* En móvil la sidebar es un drawer; el velo lo cierra al tocar fuera. */}
      {open && (
        <div
          className={`${styles.overlay} d-lg-none`}
          onClick={onNavigate}
          role="presentation"
          aria-hidden="true"
        />
      )}

      <nav
        id="adminSidebar"
        aria-label="Navegación del panel"
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''} d-flex flex-column`}
      >
        <div className={styles.brand}>
          <span className={styles.brandName}>
            PABLITO<span className={styles.brandRest}>SPORTS</span>
          </span>
          <span className={styles.brandTag}>Panel</span>
        </div>

        <ul className={`${styles.navList} nav flex-column`}>
          {secciones.map((seccion) => (
            <li className="nav-item" key={seccion.to}>
              <NavLink
                to={seccion.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                }
              >
                <AdminIcon name={seccion.icon} size={18} />
                {seccion.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
