/**
 * Editor de `social_links` (05_API.md §10.x).
 *
 * El contrato declara un objeto libre (`JSONB` sin esquema interno), de modo
 * que aquí se edita como filas **nombre → enlace** en lugar de fijar un juego
 * cerrado de redes. Añadir Instagram, Facebook o TikTok es cargar una fila; el
 * día que la tienda use otra red no hay que tocar el código ni el contrato.
 *
 * Una fila vacía no es un error: se descarta al armar el payload.
 */
export function SocialLinksField({ rows, onChange, errors, disabled }) {
  function actualizar(indice, cambios) {
    onChange(rows.map((fila, i) => (i === indice ? { ...fila, ...cambios } : fila)));
  }

  function agregar() {
    onChange([...rows, { name: '', url: '' }]);
  }

  function quitar(indice) {
    onChange(rows.filter((_, i) => i !== indice));
  }

  return (
    <fieldset className="border rounded p-3">
      <legend className="float-none w-auto px-2 fs-6 fw-semibold">Redes sociales</legend>

      {rows.length === 0 ? (
        <p className="text-muted small mb-3">Todavía no cargaste ninguna red.</p>
      ) : (
        <ul className="list-unstyled mb-3">
          {rows.map((fila, indice) => (
            // El índice como clave es correcto aquí: las filas no se reordenan
            // ni se filtran, solo se agregan y se quitan del final hacia atrás.
            <li key={indice} className="mb-2">
              <div className="row g-2 align-items-start">
                <div className="col-12 col-md-4">
                  <label className="visually-hidden" htmlFor={`red-nombre-${indice}`}>
                    Nombre de la red {indice + 1}
                  </label>
                  <input
                    id={`red-nombre-${indice}`}
                    className="form-control"
                    placeholder="instagram"
                    value={fila.name}
                    onChange={(evento) => actualizar(indice, { name: evento.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="col-12 col-md-7">
                  <label className="visually-hidden" htmlFor={`red-enlace-${indice}`}>
                    Enlace de la red {indice + 1}
                  </label>
                  <input
                    id={`red-enlace-${indice}`}
                    className={`form-control ${errors?.[indice] ? 'is-invalid' : ''}`}
                    placeholder="https://instagram.com/tu-tienda"
                    value={fila.url}
                    onChange={(evento) => actualizar(indice, { url: evento.target.value })}
                    disabled={disabled}
                  />
                  {errors?.[indice] && <p className="invalid-feedback mb-0">{errors[indice]}</p>}
                </div>
                <div className="col-12 col-md-1 d-grid">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => quitar(indice)}
                    disabled={disabled}
                    aria-label={`Quitar la red ${fila.name || indice + 1}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-outline-secondary btn-sm"
        onClick={agregar}
        disabled={disabled}
      >
        Agregar red
      </button>
    </fieldset>
  );
}
