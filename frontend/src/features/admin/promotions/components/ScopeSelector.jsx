import { useEffect, useState } from 'react';

import { useScopeOptions } from '../hooks/usePromotions.js';
import { SCOPE_LABELS, SCOPE_TYPES } from '../utils/promotionStatus.js';

/**
 * Selector de alcance de la promoción (`RN-36`).
 *
 * `RN-36` exige **exactamente uno** de producto, categoría o marca, y el CHECK
 * `scope_exclusive` de la tabla lo garantiza. Por eso la interfaz ofrece un
 * tipo y una entidad, no tres campos que podrían quedar poblados a la vez.
 */
export function ScopeSelector({ scopeType, scopeId, scopeSlug, onChange, error, disabled }) {
  const [busqueda, setBusqueda] = useState('');
  const { options, isLoading, isError, supportsSearch } = useScopeOptions(scopeType, busqueda);

  // Al editar, el DTO identifica la entidad por `slug` (`NamedEntityDTO`); el
  // identificador aparece cuando llegan las opciones.
  useEffect(() => {
    if (scopeId || !scopeSlug || options.length === 0) return;
    const encontrada = options.find((opcion) => opcion.slug === scopeSlug);
    if (encontrada) onChange({ scopeId: String(encontrada.id) });
  }, [scopeId, scopeSlug, options, onChange]);

  function cambiarTipo(evento) {
    // Cambiar de tipo limpia la entidad anterior: dejarla apuntaría a algo del
    // tipo equivocado y el backend lo rechazaría.
    onChange({ scopeType: evento.target.value, scopeId: '', scopeSlug: '' });
    setBusqueda('');
  }

  return (
    <fieldset className="mb-3" disabled={disabled}>
      <legend className="form-label mb-2">Se aplica a</legend>

      <div className="btn-group mb-2" role="group" aria-label="Tipo de alcance">
        {Object.values(SCOPE_TYPES).map((tipo) => (
          <div key={tipo}>
            <input
              type="radio"
              className="btn-check"
              name="scopeType"
              id={`scope-${tipo}`}
              value={tipo}
              checked={scopeType === tipo}
              onChange={cambiarTipo}
            />
            <label className="btn btn-outline-secondary btn-sm" htmlFor={`scope-${tipo}`}>
              {SCOPE_LABELS[tipo]}
            </label>
          </div>
        ))}
      </div>

      {supportsSearch && (
        <div className="input-group input-group-sm mb-2">
          <span className="input-group-text" aria-hidden="true">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar producto por nombre o SKU"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
          />
        </div>
      )}

      <label htmlFor="scopeId" className="visually-hidden">
        {SCOPE_LABELS[scopeType]}
      </label>
      <select
        id="scopeId"
        className={`form-select ${error ? 'is-invalid' : ''}`}
        value={scopeId}
        onChange={(evento) => onChange({ scopeId: evento.target.value })}
        aria-describedby={error ? 'scopeId-error' : undefined}
      >
        <option value="">
          {isLoading ? 'Cargando…' : `Elegí ${SCOPE_LABELS[scopeType].toLowerCase()}`}
        </option>
        {options.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.name}
            {opcion.sku ? ` · ${opcion.sku}` : ''}
          </option>
        ))}
      </select>

      {isError && <p className="form-text text-danger mb-0">No pudimos cargar las opciones.</p>}
      {error && (
        <p className="invalid-feedback d-block mb-0" id="scopeId-error">
          {error}
        </p>
      )}
      {supportsSearch && !isLoading && options.length === 0 && (
        <p className="form-text mb-0">Sin resultados. Probá con otro texto.</p>
      )}
    </fieldset>
  );
}
