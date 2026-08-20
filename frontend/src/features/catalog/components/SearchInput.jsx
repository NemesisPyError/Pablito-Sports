import { useEffect, useState } from 'react';

/**
 * Campo de búsqueda con debounce.
 *
 * 09_COMPONENTES.md §9.2: no ejecuta la búsqueda, solo emite el valor.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar productos…',
  debounceMs = 300,
}) {
  const [internalValue, setInternalValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== value) {
        onChange(internalValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [internalValue, value, onChange, debounceMs]);

  return (
    <div className="input-group" role="search">
      <input
        type="search"
        className="form-control"
        placeholder={placeholder}
        value={internalValue}
        onChange={(event) => setInternalValue(event.target.value)}
        aria-label="Buscar productos"
      />
      {internalValue && (
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => {
            setInternalValue('');
            onChange('');
          }}
          aria-label="Limpiar búsqueda"
        >
          &times;
        </button>
      )}
    </div>
  );
}
