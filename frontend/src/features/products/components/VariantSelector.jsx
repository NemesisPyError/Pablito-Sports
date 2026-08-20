import { useEffect, useState } from 'react';

/**
 * Selector de talle.
 *
 * 09_COMPONENTES.md §9.8: no agrega al carrito; solo emite la variante seleccionada.
 */
export function VariantSelector({ sizes, variants, selectedVariant, onChange, error }) {
  const [selectedSize, setSelectedSize] = useState(selectedVariant?.size?.slug ?? '');

  const availableSlugs = new Set(variants.map((v) => v.size?.slug));

  useEffect(() => {
    const matched = variants.find((v) => v.size?.slug === selectedSize);
    onChange(matched ?? null);
  }, [selectedSize, variants, onChange]);

  return (
    <div role="radiogroup" aria-label="Seleccionar variante">
      {sizes.length > 0 && (
        <fieldset className="mb-3">
          <legend className="h6">Talle</legend>
          <div className="d-flex flex-wrap gap-2">
            {sizes.map((size) => {
              const isAvailable = availableSlugs.has(size.slug);
              const isSelected = selectedSize === size.slug;
              return (
                <button
                  key={size.slug}
                  type="button"
                  disabled={!isAvailable}
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSelectedSize(isSelected ? '' : size.slug)}
                  aria-pressed={isSelected}
                >
                  {size.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && <div className="alert alert-danger py-2">{error}</div>}
    </div>
  );
}
