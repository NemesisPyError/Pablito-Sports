import { AVAILABILITY_OPTIONS, SORT_OPTIONS } from '../hooks/useAdminProducts.js';

/**
 * Filtros del listado de productos (05_API.md §9.3).
 *
 * Los criterios son exactamente los que acepta el endpoint. `brand` y
 * `category` viajan por **slug** (`AD-23`), no por identificador.
 */
export function ProductsFilters({ filters, options, onChange, onReset, hasActiveFilters }) {
  return (
    <section className="card mb-3" aria-label="Filtros">
      <div className="card-body">
        <div className="row g-2">
          <div className="col-12 col-lg-4">
            <label htmlFor="filtro-q" className="form-label small mb-1">
              Buscar
            </label>
            <input
              id="filtro-q"
              type="search"
              className="form-control form-control-sm"
              placeholder="Nombre, SKU o slug"
              value={filters.q}
              onChange={(evento) => onChange({ q: evento.target.value })}
            />
          </div>

          <div className="col-6 col-lg-2">
            <label htmlFor="filtro-marca" className="form-label small mb-1">
              Marca
            </label>
            <select
              id="filtro-marca"
              className="form-select form-select-sm"
              value={filters.brand}
              onChange={(evento) => onChange({ brand: evento.target.value })}
            >
              <option value="">Todas</option>
              {options.brands.map((marca) => (
                <option key={marca.id} value={marca.slug}>
                  {marca.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-lg-2">
            <label htmlFor="filtro-categoria" className="form-label small mb-1">
              Categoría
            </label>
            <select
              id="filtro-categoria"
              className="form-select form-select-sm"
              value={filters.category}
              onChange={(evento) => onChange({ category: evento.target.value })}
            >
              <option value="">Todas</option>
              {options.categories.map((categoria) => (
                <option key={categoria.id} value={categoria.slug}>
                  {categoria.name}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-lg-2">
            <label htmlFor="filtro-disponibilidad" className="form-label small mb-1">
              Disponibilidad
            </label>
            <select
              id="filtro-disponibilidad"
              className="form-select form-select-sm"
              value={filters.availability}
              onChange={(evento) => onChange({ availability: evento.target.value })}
            >
              <option value="">Todas</option>
              {AVAILABILITY_OPTIONS.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-lg-2">
            <label htmlFor="filtro-estado" className="form-label small mb-1">
              Estado
            </label>
            <select
              id="filtro-estado"
              className="form-select form-select-sm"
              value={filters.is_active}
              onChange={(evento) => onChange({ is_active: evento.target.value })}
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Ocultos</option>
            </select>
          </div>

          <div className="col-6 col-lg-3">
            <label htmlFor="filtro-orden" className="form-label small mb-1">
              Orden
            </label>
            <select
              id="filtro-orden"
              className="form-select form-select-sm"
              value={filters.sort}
              onChange={(evento) => onChange({ sort: evento.target.value })}
            >
              {SORT_OPTIONS.map((opcion) => (
                <option key={opcion.value} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </div>

          <div className="col-6 col-lg-3 d-flex align-items-end">
            <div className="form-check">
              <input
                id="filtro-eliminados"
                type="checkbox"
                className="form-check-input"
                checked={filters.deleted}
                onChange={(evento) => onChange({ deleted: evento.target.checked })}
              />
              <label htmlFor="filtro-eliminados" className="form-check-label small">
                Ver eliminados
              </label>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="col-12 col-lg-6 d-flex align-items-end justify-content-lg-end">
              <button type="button" className="btn btn-link btn-sm" onClick={onReset}>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
