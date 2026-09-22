import styles from './AdminLoadingScreen.module.css';

/**
 * Pantalla de carga del panel administrativo.
 *
 * Reemplaza el `LoadingState` genérico (spinner de Bootstrap sobre fondo
 * blanco, "pantalla del navegador") como *fallback* del `Suspense` que
 * envuelve `AdminRoutes` en `App.jsx`: es lo primero que ve quien entra a
 * `/admin` mientras se descarga el panel, y antes de esto no había forma de
 * mostrar la identidad de Pablito Sports ahí — quedaba en blanco.
 */
export function AdminLoadingScreen() {
  return (
    <div className={styles.page} role="status" aria-live="polite">
      <h1 className={styles.brand}>
        <span className={styles.brandName}>
          Pablito<span className={styles.brandMark}>Sports</span>
        </span>
      </h1>

      <div className={styles.spinner} aria-hidden="true" />

      <p className={styles.label}>Cargando panel…</p>
    </div>
  );
}
