import { Link } from 'react-router-dom';

import { AdminIcon } from './AdminIcon.jsx';
import styles from './AdminLayout.module.css';

/**
 * Barra superior del panel (07_PANEL_ADMIN.md §5.1, §5.2).
 *
 * §5.2: muestra el título contextual, el usuario autenticado y la salida.
 * **No** contiene navegación profunda del dominio: para eso está la sidebar.
 *
 * v2.9.11 (rediseño visual, pedido explícito del usuario): mismos tres
 * elementos (título, usuario, Salir) — solo composición y espaciado.
 *
 * El nombre de usuario enlaza a «Mi cuenta» (`/admin/account`), la pantalla
 * donde cualquier administrador cambia su propia contraseña (`CU-A-27`).
 */
export function AdminTopbar({
  title,
  administrator,
  onToggleSidebar,
  onLogout,
  loggingOut,
  theme,
  onToggleTheme,
}) {
  const esOscuro = theme === 'dark';

  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={`${styles.iconButton} d-lg-none`}
        onClick={onToggleSidebar}
        aria-controls="adminSidebar"
        aria-label="Alternar navegación"
      >
        <AdminIcon name="menu" size={20} />
      </button>

      <h1 className={styles.pageTitle}>{title}</h1>

      {onToggleTheme && (
        <button
          type="button"
          className={styles.iconButton}
          onClick={onToggleTheme}
          aria-pressed={esOscuro}
          aria-label={esOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={esOscuro ? 'Modo claro' : 'Modo oscuro'}
        >
          <AdminIcon name={esOscuro ? 'sun' : 'moon'} size={18} />
        </button>
      )}

      {administrator && (
        <Link to="/admin/account" className={styles.userBadge} title="Mi cuenta">
          <AdminIcon name="user" size={16} />
          <span className="d-none d-sm-inline">{administrator.username}</span>
        </Link>
      )}

      <button
        type="button"
        className={styles.logoutButton}
        onClick={onLogout}
        disabled={loggingOut}
      >
        <AdminIcon name="logout" size={16} />
        {loggingOut ? 'Saliendo…' : 'Salir'}
      </button>
    </header>
  );
}
