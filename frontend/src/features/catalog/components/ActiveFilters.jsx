import { GENDER_FILTER_OPTIONS } from '../hooks/useCatalogFilters.js';
import styles from './ActiveFilters.module.css';

/** Mismas etiquetas que ofrece el `<select>` de Género (`FiltersPanel`): el
 * chip activo tiene que decir lo mismo que la opción que lo generó. */
const GENDER_CHIP_LABELS = Object.fromEntries(
  GENDER_FILTER_OPTIONS.map((option) => [option.value, option.label]),
);

const FILTER_LABELS = {
  q: 'Búsqueda',
  brand: 'Marca',
  category: 'Categoría',
  gender: 'Género',
  sport: 'Deporte',
  size: 'Talle',
  min_price: 'Precio mínimo',
  max_price: 'Precio máximo',
  on_sale: 'En oferta',
  is_new: 'Nuevos',
  is_featured: 'Destacados',
};

/** `gender` viaja como slugs separados por coma (`men,unisex`); se traducen uno a uno. */
function formatValue(key, value) {
  if (value === true) return 'Sí';
  if (key === 'gender') {
    return String(value)
      .split(',')
      .map((slug) => GENDER_CHIP_LABELS[slug] ?? slug)
      .join(', ');
  }
  return value;
}

/**
 * Muestra los filtros activos como chips removibles.
 */
export function ActiveFilters({ filters, onRemove, onReset }) {
  const active = Object.entries(filters).filter(([key, value]) => {
    if (key === 'sort' || key === 'page' || key === 'per_page') return false;
    return value !== '' && value !== false && value !== null && value !== undefined;
  });

  if (active.length === 0) return null;

  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
      {active.map(([key, value]) => (
        <span
          key={key}
          className="badge bg-light text-dark border d-inline-flex align-items-center gap-1"
        >
          {FILTER_LABELS[key] ?? key}: {formatValue(key, value)}
          <button
            type="button"
            className="btn btn-link btn-sm p-0 text-dark text-decoration-none"
            onClick={() => onRemove(key)}
            aria-label={`Quitar filtro ${FILTER_LABELS[key] ?? key}`}
          >
            &times;
          </button>
        </span>
      ))}
      <button type="button" className={styles.clearAll} onClick={onReset}>
        Limpiar todo
      </button>
    </div>
  );
}
