/**
 * Barra superior del panel (07_PANEL_ADMIN.md §5.1, §5.2).
 *
 * §5.2: muestra el título contextual, el usuario autenticado y la salida.
 * **No** contiene navegación profunda del dominio: para eso está la sidebar.
 */
export function AdminTopbar({ title, administrator, onToggleSidebar, onLogout, loggingOut }) {
  return (
    <header className="bg-white border-bottom sticky-top">
      <div className="d-flex align-items-center gap-3 px-3 py-2">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm d-lg-none"
          onClick={onToggleSidebar}
          aria-controls="adminSidebar"
          aria-label="Alternar navegación"
        >
          ☰
        </button>

        <h1 className="h6 mb-0 flex-grow-1 text-truncate">{title}</h1>

        {administrator && (
          <span className="small text-muted d-none d-sm-inline text-truncate">
            {administrator.username}
          </span>
        )}

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
    </header>
  );
}
