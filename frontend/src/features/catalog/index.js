/**
 * Superficie pública del feature `catalog` (DEP-08).
 */
export { CatalogPage } from './pages/CatalogPage.jsx';
export { ProductCard } from './components/ProductCard.jsx';
export { ProductGrid } from './components/ProductGrid.jsx';
export { FiltersPanel } from './components/FiltersPanel.jsx';
export { ActiveFilters } from './components/ActiveFilters.jsx';
export { SearchInput } from './components/SearchInput.jsx';
export { useProducts } from './hooks/useProducts.js';
export { useCategories } from './hooks/useCategories.js';
export { useBrands } from './hooks/useBrands.js';
export { useCatalogFilters } from './hooks/useCatalogFilters.js';
export { catalogService } from './services/catalogService.js';
