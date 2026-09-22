import styles from './AdminLayout.module.css';

/**
 * Área de renderizado de la pantalla activa (07_PANEL_ADMIN.md §5.2).
 *
 * §5.2: cada pantalla trae sus propios estados de carga y error; este
 * contenedor solo aporta el desplazamiento y el ancho de lectura, y **no**
 * acumula estado de otras pantallas.
 */
export function AdminContent({ children }) {
  return (
    <main className={`${styles.content} flex-grow-1`}>
      <div className="container-fluid p-3 p-lg-4">{children}</div>
    </main>
  );
}

