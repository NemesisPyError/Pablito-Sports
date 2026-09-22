import { useEffect, useRef, useState } from 'react';

/**
 * Selector del mini banner del banco.
 *
 * Mismo criterio de obligatoriedad que `BannerImageField`: obligatoria al
 * crear, omitible al editar (mientras no se elija ninguna, el campo `image`
 * no viaja y el backend conserva la actual). Sin recorte: el mini banner es
 * un logotipo chico, no una pieza de portada que necesite encuadre.
 */
export function BankImageField({ currentImageUrl, file, onSelect, error, disabled }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function alSeleccionar(evento) {
    const elegido = evento.target.files?.[0] ?? null;
    evento.target.value = '';
    if (elegido) onSelect(elegido);
  }

  function descartar() {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const mostrada = previewUrl ?? currentImageUrl ?? null;
  const esNueva = Boolean(previewUrl);

  return (
    <div>
      <span className="form-label d-block">Mini banner</span>

      <div className={`card ${error ? 'border-danger' : ''}`} style={{ maxWidth: '16rem' }}>
        {mostrada ? (
          <div className="ratio ratio-1x1 bg-light overflow-hidden">
            <img
              src={mostrada}
              alt={esNueva ? 'Vista previa del mini banner elegido' : 'Mini banner actual del banco'}
              className="w-100 h-100 object-fit-contain"
            />
          </div>
        ) : (
          <div className="ratio ratio-1x1 bg-light" aria-hidden="true">
            <div className="d-flex align-items-center justify-content-center text-muted">
              <span className="small">Sin imagen</span>
            </div>
          </div>
        )}

        <div className="card-body p-2 d-flex flex-wrap align-items-center gap-2">
          <input
            ref={inputRef}
            id="image"
            type="file"
            className="d-none"
            accept="image/*"
            onChange={alSeleccionar}
            disabled={disabled}
          />
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            {mostrada ? 'Reemplazar imagen' : 'Elegir imagen'}
          </button>

          {esNueva && (
            <>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={descartar}
                disabled={disabled}
              >
                Descartar
              </button>
              <span className="small text-muted text-truncate">{file.name}</span>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-danger small mt-1 mb-0">{error}</p>}
    </div>
  );
}
