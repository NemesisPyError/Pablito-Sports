import { NavLink } from 'react-router-dom';

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
 */
const SECCIONES = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/admin/products', label: 'Productos', icon: '▤' },
  { to: '/admin/categories', label: 'Categorías', icon: '▧' },
  { to: '/admin/brands', label: 'Marcas', icon: '◈' },
  { to: '/admin/sports', label: 'Deportes', icon: '⚽' },
  { to: '/admin/sizes', label: 'Talles', icon: '◫' },
  { to: '/admin/promotions', label: 'Promociones', icon: '％' },
  { to: '/admin/banners', label: 'Banners', icon: '▬' },
];

export function AdminSidebar({ open, onNavigate }) {
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
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''} bg-dark text-white d-flex flex-column`}
      >
        <div className="p-3 border-bottom border-secondary">
          <span className="fw-bold">Pablito Sports</span>
          <span className="d-block small text-white-50">Panel</span>
        </div>

        <ul className="nav nav-pills flex-column p-2 mb-0">
          {SECCIONES.map((seccion) => (
            <li className="nav-item" key={seccion.to}>
              <NavLink
                to={seccion.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `nav-link d-flex align-items-center gap-2 ${
                    isActive ? 'active' : 'text-white-50'
                  }`
                }
              >
                <span aria-hidden="true">{seccion.icon}</span>
                {seccion.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
