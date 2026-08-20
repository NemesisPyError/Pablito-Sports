import { useEffect, useRef, useState } from 'react';

import { BannerImageCropModal } from './BannerImageCropModal.jsx';

/**
 * Selector de imagen del banner (05_API.md §10.13).
 *
 * §10.13: obligatoria al crear, omitible al editar. Por eso al editar se
 * muestra la imagen ya cargada y elegir una nueva es **reemplazar**: mientras no
 * se elija ninguna, el campo `image` no viaja y el backend conserva la actual.
 *
 * La imagen se muestra con un `<img>` liso y no con el componente `Image`
 * compartido: ese deduce los anchos del espacio de **productos** (400/800/1600,
 * `AI-06` §17.1.2), y el de banners tiene otros (800/1600/2400). Aplicarlo aquí
 * pediría un derivado de 400 px que no existe.
 */
export function BannerImageField({ currentImageUrl, file, onSelect, error, disabled }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [archivoParaRecortar, setArchivoParaRecortar] = useState(null);

  // La URL del objeto se libera al cambiar de archivo y al desmontar: sin eso,
  // cada reemplazo deja el anterior retenido en memoria.
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
    // Permite volver a elegir el mismo archivo después de descartarlo.
    evento.target.value = '';
    // No se sube tal cual: primero pasa por el recorte, así cualquier imagen
    // (vertical, cuadrada, lo que sea) sale ajustada al formato del banner.
    if (elegido) setArchivoParaRecortar(elegido);
  }

  function confirmarRecorte(archivoRecortado) {
    onSelect(archivoRecortado);
    setArchivoParaRecortar(null);
  }

  function descartar() {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const mostrada = previewUrl ?? currentImageUrl ?? null;
  const esNueva = Boolean(previewUrl);

  return (
    <div>
      <span className="form-label d-block">Imagen</span>

      <div className={`card ${error ? 'border-danger' : ''}`}>
        {mostrada ? (
          <div className="ratio ratio-21x9 bg-light">
            <img
              src={mostrada}
              alt={esNueva ? 'Vista previa de la imagen elegida' : 'Imagen actual del banner'}
              className="w-100 h-100 object-fit-cover"
            />
          </div>
        ) : (
          <div className="ratio ratio-21x9 bg-light" aria-hidden="true">
            {/* `d-flex` va en el hijo: `.ratio` posiciona su primer hijo en
                absoluto y le da el alto con un pseudo elemento. */}
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

      {error ? (
        <p className="text-danger small mt-1 mb-0">{error}</p>
      ) : (
        <p className="form-text mb-0">
          {esNueva && currentImageUrl
            ? 'Al guardar, esta imagen reemplazará a la actual.'
            : 'Cualquier imagen sirve: al elegirla se abre un recorte para ajustarla al formato del banner.'}
        </p>
      )}

      <BannerImageCropModal
        file={archivoParaRecortar}
        onConfirm={confirmarRecorte}
        onCancel={() => setArchivoParaRecortar(null)}
      />
    </div>
  );
}
