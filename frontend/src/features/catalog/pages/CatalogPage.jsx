import { EmptyState } from '../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../shared/components/LoadingState.jsx';
import { Page } from '../../../shared/components/Page.jsx';
import { catalogMeta } from '../../../shared/seo/pageMeta.js';
import { useDocumentMeta } from '../../../shared/seo/useDocumentMeta.js';
import { visibleCategories } from '../../../shared/utils/categoryGenders.js';
import { ActiveFilters } from '../components/ActiveFilters.jsx';
import { FiltersPanel } from '../components/FiltersPanel.jsx';
import { Pagination } from '../../../shared/components/Pagination.jsx';
import { ProductGrid } from '../components/ProductGrid.jsx';
import { useBrands } from '../hooks/useBrands.js';
import { useCategories } from '../hooks/useCategories.js';
import { useCatalogFilters } from '../hooks/useCatalogFilters.js';
import { useProducts } from '../hooks/useProducts.js';

/**
 * Página de catálogo con listado, filtros y paginación.
 */
export function CatalogPage({ storeSettings }) {
  const { filters, sortOptions, genderSections, updateFilter, resetFilters } = useCatalogFilters();
  const productsQuery = useProducts(filters);
  const categoriesQuery = useCategories();
  const brandsQuery = useBrands();

  // §17.3: con filtros o paginación esta pantalla no se indexa y su canónica
  // apunta al catálogo desnudo. De eso se ocupa `useDocumentMeta` según la URL.
  useDocumentMeta(
    catalogMeta(storeSettings, { total: productsQuery.data?.meta?.total }),
    storeSettings,
  );

  const isLoading = productsQuery.isLoading || categoriesQuery.isLoading || brandsQuery.isLoading;
  const isError = productsQuery.isError;

  const products = productsQuery.data?.products ?? [];
  const meta = productsQuery.data?.meta ?? {};

  const handleRemoveFilter = (key) => {
    const booleanFilters = ['on_sale', 'is_new', 'is_featured'];
    updateFilter(key, booleanFilters.includes(key) ? false : '');
  };

  const migas = [{ label: 'Inicio', to: '/' }, { label: 'Catálogo' }];

  if (isError) {
    return (
      <Page title="Catálogo" breadcrumbs={migas}>
        <ErrorState error={productsQuery.error} onRetry={productsQuery.refetch} />
      </Page>
    );
  }

  return (
    <Page title="Catálogo" eyebrow="Todo el catálogo" breadcrumbs={migas}>
      <div className="row g-4">
        <div className="col-12 col-md-3 col-lg-2">
          <FiltersPanel
            filters={filters}
            facets={meta.facets}
            sortOptions={sortOptions}
            genderSections={genderSections}
            categories={visibleCategories(categoriesQuery.data, filters.gender, filters.category)}
            brands={brandsQuery.data ?? []}
            onChange={updateFilter}
            onReset={resetFilters}
          />
        </div>

        <div className="col-12 col-md-9 col-lg-10">
          <ActiveFilters filters={filters} onRemove={handleRemoveFilter} onReset={resetFilters} />

          {isLoading ? (
            <LoadingState message="Cargando productos…" />
          ) : products.length === 0 ? (
            <EmptyState
              title="No encontramos productos"
              message="Probá ajustando los filtros o la búsqueda."
              actionLabel="Limpiar filtros"
              onAction={resetFilters}
            />
          ) : (
            <>
              <ProductGrid products={products} />
              <Pagination
                page={filters.page}
                totalPages={meta.total_pages ?? 1}
                total={meta.total ?? 0}
                onPageChange={(page) => updateFilter('page', page)}
              />
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
