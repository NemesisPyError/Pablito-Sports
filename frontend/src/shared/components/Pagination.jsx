/**
 * Paginación por desplazamiento.
 *
 * 09_COMPONENTES.md §9.5: no cambia la URL; solo emite el cambio de página.
 */
export function Pagination({ page, totalPages, total, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 1;
  const start = Math.max(1, page - delta);
  const end = Math.min(totalPages, page + delta);

  for (let i = start; i <= end; i += 1) {
    pages.push(i);
  }

  return (
    <nav aria-label="Paginación" className="d-flex flex-column align-items-center gap-2 mt-4">
      <p className="small text-muted mb-0">
        Página {page} de {totalPages} ({total} resultados)
      </p>
      <ul className="pagination pagination-sm mb-0">
        <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Página anterior"
          >
            Anterior
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === page ? 'active' : ''}`}>
            <button
              type="button"
              className="page-link"
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Página ${p}`}
            >
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
          <button
            type="button"
            className="page-link"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Página siguiente"
          >
            Siguiente
          </button>
        </li>
      </ul>
    </nav>
  );
}
