import { useState } from 'react';

import { SearchInput } from './SearchInput.jsx';

/**
 * Panel de filtros del catálogo.
 *
 * En móvil se muestra como drawer/offcanvas; en escritorio como sidebar.
 */
export function FiltersPanel({
  filters,
  facets,
  sortOptions,
  categories,
  brands,
  onChange,
  onReset,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const facetOptions = facets ?? {};

  const handleBooleanChange = (key) => (event) => {
    onChange(key, event.target.checked);
  };

  const handleSelectChange = (key) => (event) => {
    onChange(key, event.target.value);
  };

  const filterContent = (
    <>
      <div className="mb-3">
        <SearchInput value={filters.q} onChange={(value) => onChange('q', value)} />
      </div>

      <div className="mb-3">
        <label htmlFor="sort-select" className="form-label small fw-semibold">
          Ordenar por
        </label>
        <select
          id="sort-select"
          className="form-select form-select-sm"
          value={filters.sort}
          onChange={handleSelectChange('sort')}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <p className="small fw-semibold mb-2">Categoría</p>
        <select
          className="form-select form-select-sm"
          value={filters.category}
          onChange={handleSelectChange('category')}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <p className="small fw-semibold mb-2">Marca</p>
        <select
          className="form-select form-select-sm"
          value={filters.brand}
          onChange={handleSelectChange('brand')}
          aria-label="Filtrar por marca"
        >
          <option value="">Todas</option>
          {(facetOptions.brand ?? brands).map((brand) => (
            <option key={brand.slug} value={brand.slug}>
              {brand.name} {brand.count != null ? `(${brand.count})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <div className="form-check">
          <input
            id="filter-on-sale"
            className="form-check-input"
            type="checkbox"
            checked={filters.on_sale}
            onChange={handleBooleanChange('on_sale')}
          />
          <label className="form-check-label" htmlFor="filter-on-sale">
            En oferta
          </label>
        </div>
        <div className="form-check">
          <input
            id="filter-is-new"
            className="form-check-input"
            type="checkbox"
            checked={filters.is_new}
            onChange={handleBooleanChange('is_new')}
          />
          <label className="form-check-label" htmlFor="filter-is-new">
            Nuevos
          </label>
        </div>
        <div className="form-check">
          <input
            id="filter-is-featured"
            className="form-check-input"
            type="checkbox"
            checked={filters.is_featured}
            onChange={handleBooleanChange('is_featured')}
          />
          <label className="form-check-label" htmlFor="filter-is-featured">
            Destacados
          </label>
        </div>
      </div>

      <button type="button" className="btn btn-outline-secondary btn-sm w-100" onClick={onReset}>
        Limpiar filtros
      </button>
    </>
  );

  return (
    <>
      <button
        type="button"
        className="btn btn-outline-primary d-md-none w-100 mb-3"
        onClick={() => setMobileOpen(true)}
        aria-expanded={mobileOpen}
        aria-controls="filters-panel"
      >
        Filtros
      </button>

      <aside
        id="filters-panel"
        className={`d-none d-md-block bg-white rounded border p-3 ${mobileOpen ? 'd-block' : ''}`}
      >
        {filterContent}
      </aside>

      {mobileOpen && (
        <>
          <div
            className="offcanvas offcanvas-start show d-md-none"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
          >
            <div className="offcanvas-header">
              <h2 className="offcanvas-title h5">Filtros</h2>
              <button
                type="button"
                className="btn-close"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar filtros"
              />
            </div>
            <div className="offcanvas-body">{filterContent}</div>
          </div>
          <div
            className="offcanvas-backdrop fade show d-md-none"
            onClick={() => setMobileOpen(false)}
          />
        </>
      )}
    </>
  );
}
