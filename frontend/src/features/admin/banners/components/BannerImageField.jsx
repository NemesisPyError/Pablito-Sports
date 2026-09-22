import { useEffect, useRef, useState } from 'react';

import { BannerImageCropModal } from './BannerImageCropModal.jsx';

/**
 * Selector de imagen del banner (05_API.md §10.13).
 *
 * §10.13: obligatoria al crear, omitible al editar. Por eso al editar se
 * muestra la imagen ya cargada y elegir una nueva es **reemplazar**: mientras no
 * se elija ninguna, el campo `image` no viaja y el backend conserva la actual.
 *
 * **v2.9.4 — el recorte deja de ser obligatorio** (pedido explícito del
 * usuario). Hasta v2.9.3, elegir cualquier archivo abría un editor que lo
 * forzaba a 21:9 sin alternativa: el original nunca llegaba a subirse, se
 * descartaba apenas se confirmaba el recorte. Ahora, al elegir un archivo,
 * el administrador decide entre **"Usar imagen completa"** (el `File`
 * original se sube tal cual — mismo formato, resolución y calidad, sin pasar
 * por `<canvas>`) y **"Ajustar / Recortar"** (abre `BannerImageCropModal`,
 * que ahora respeta la proporción real de la imagen en vez de forzar un
 * formato). El backend (`local_storage.py`) ya generaba derivados
 * proporcionales sin recortar — el recorte forzado era una restricción solo
 * del frontend, no del pipeline de imágenes.
 *
 * La imagen se muestra con un `<img>` liso y no con el componente `Image`
 * compartido: ese deduce los anchos del espacio de **productos** (400/800/1600,
 * `AI-06` §17.1.2), y el de banners tiene otros (800/1600/2400). Aplicarlo aquí
 * pediría un derivado de 400 px que no existe.
 */
export function BannerImageField({ currentImageUrl, file, onSelect, error, disabled }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [archivoElegido, setArchivoElegido] = useState(null);
  const [previewElegidoUrl, setPreviewElegidoUrl] = useState(null);
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

  // Vista previa del archivo recién elegido, mientras el administrador
  // todavía no decidió el modo — mismo criterio de liberar el objeto URL.
  useEffect(() => {
    if (!archivoElegido) {
      setPreviewElegidoUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(archivoElegido);
    setPreviewElegidoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [archivoElegido]);

  function alSeleccionar(evento) {
    const elegido = evento.target.files?.[0] ?? null;
    // Permite volver a elegir el mismo archivo después de descartarlo.
    evento.target.value = '';
    // No se resuelve solo: el administrador elige el modo a continuación
    // ("Usar imagen completa" o "Ajustar / Recortar").
    if (elegido) setArchivoElegido(elegido);
  }

  function usarImagenCompleta() {
    // Sin canvas, sin recompresión: el `File` original viaja tal cual.
    onSelect(archivoElegido);
    setArchivoElegido(null);
  }

  function abrirRecorte() {
    setArchivoParaRecortar(archivoElegido);
  }

  function confirmarRecorte(archivoRecortado) {
    onSelect(archivoRecortado);
    setArchivoParaRecortar(null);
    setArchivoElegido(null);
  }

  function cancelarRecorte() {
    // Vuelve a la elección de modo, no descarta el archivo entero: el
    // administrador puede arrepentirse de recortar sin tener que elegir el
    // archivo de nuevo.
    setArchivoParaRecortar(null);
  }

  function cancelarEleccion() {
    setArchivoElegido(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function descartar() {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const eligiendoModo = Boolean(archivoElegido) && !archivoParaRecortar;
  const mostrada = previewUrl ?? currentImageUrl ?? null;
  const esNueva = Boolean(previewUrl);

  return (
    <div>
      <span className="form-label d-block">Imagen</span>

      <div className={`card ${error ? 'border-danger' : ''}`}>
        {eligiendoModo ? (
          <div className="p-2">
            <div className="ratio ratio-1x1 bg-light rounded overflow-hidden mb-2">
              <img
                src={previewElegidoUrl}
                alt="Vista previa de la imagen elegida"
                className="w-100 h-100 object-fit-contain"
              />
            </div>
            <p className="small text-muted mb-2">
              Podés usar la imagen completa o ajustarla antes de subirla.
            </p>
            <div className="d-flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={usarImagenCompleta}
              >
                Usar imagen completa
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={abrirRecorte}
              >
                Ajustar / Recortar
              </button>
              <button
                type="button"
                className="btn btn-link btn-sm text-muted"
                onClick={cancelarEleccion}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <>
            {mostrada ? (
              <div className="ratio ratio-1x1 bg-light overflow-hidden">
                <img
                  src={mostrada}
                  alt={esNueva ? 'Vista previa de la imagen elegida' : 'Imagen actual del banner'}
                  className="w-100 h-100 object-fit-contain"
                />
              </div>
            ) : (
              <div className="ratio ratio-1x1 bg-light" aria-hidden="true">
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
          </>
        )}
      </div>

      {error ? (
        <p className="text-danger small mt-1 mb-0">{error}</p>
      ) : (
        !eligiendoModo && (
          <p className="form-text mb-0">
            {esNueva && currentImageUrl
              ? 'Al guardar, esta imagen reemplazará a la actual.'
              : 'Podés usar la imagen completa o ajustarla antes de subirla.'}
          </p>
        )
      )}

      <BannerImageCropModal
        file={archivoParaRecortar}
        onConfirm={confirmarRecorte}
        onCancel={cancelarRecorte}
      />
    </div>
  );
}
