import { Link } from 'react-router-dom';

/**
 * Página 404 del panel (06_FRONTEND.md §8.1, 07_PANEL_ADMIN.md §8.2).
 *
 * Se renderiza **dentro** de `AdminLayout` (sidebar + topbar visibles), como
 * cualquier otra pantalla del panel. Reemplaza al redirect silencioso al
 * Dashboard: una ruta `/admin/...` inexistente ahora se comunica y ofrece la
 * vuelta.
 */
export function AdminNotFoundPage() {
  return (
    <div className="text-center py-5">
      <p className="display-6 fw-bold mb-1">404</p>
      <p className="fw-semibold mb-2">Esta pantalla del panel no existe</p>
      <p className="text-muted small mb-3">
        Puede que el enlace esté mal o que la sección se haya movido.
      </p>
      <Link to="/admin/dashboard" className="btn btn-primary btn-sm">
        Volver al panel
      </Link>
    </div>
  );
}
