import { useEffect, useRef, useState } from 'react';

import styles from './BannerImageCropModal.module.css';

// Igual a `ratio-21x9` que ya usan la vista previa del campo y la tabla de
// banners (`BannerImageField`, `BannersTable`): el recorte debe coincidir con
// lo que el admin ve después de guardar, no con un valor distinto.
const RATIO = 21 / 9;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
// Techo del recorte exportado: coincide con el ancho más grande que el
// pipeline de imágenes genera para banners (`wide`, 2400px). Pedir más no
// aporta nada porque el servidor nunca lo va a servir.
const MAX_OUTPUT_WIDTH = 2400;

function recortar(offset, dispW, dispH, frameW, frameH) {
  const minX = frameW - dispW;
  const minY = frameH - dispH;
  return {
    x: Math.min(0, Math.max(minX, offset.x)),
    y: Math.min(0, Math.max(minY, offset.y)),
  };
}

// Nombre propio, no derivado del original: el backend rechaza cualquier
// nombre con más de un punto como posible doble extensión (`foto.jpg.php`,
// `local_storage.py` §11.2), y ese chequeo es amplio de más — también
// rechaza nombres legítimos con puntos en medio (p. ej. los que dejan
// algunas apps de descarga, "SaveClip.App_..._n.jpg"). Como el recorte ya
// genera un archivo nuevo, evitamos el problema de raíz en vez de heredarlo.
function nombreDeSalida() {
  return `banner-${Date.now()}.jpg`;
}

/**
 * Editor de recorte del banner: se abre al elegir un archivo y deja arrastrar
 * y hacer zoom dentro del marco 21:9 antes de subirlo.
 *
 * El recorte se resuelve en el navegador (canvas) y se sube ya la imagen
 * final: el backend no recorta a propósito (`local_storage.py`, §17.1.2 —
 * decidir el encuadre es tarea de quien carga la foto), así que si el admin
 * no quiere recortar acá, no tiene otro lugar para ajustarlo.
 */
export function BannerImageCropModal({ file, onConfirm, onCancel }) {
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const arrastreRef = useRef(null);
  const inicializadoRef = useRef(null);

  const [imgUrl, setImgUrl] = useState(null);
  const [naturalSize, setNaturalSize] = useState(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [procesando, setProcesando] = useState(false);

  const isOpen = Boolean(file);

  // Objeto URL del archivo elegido: se libera al cambiar de archivo y al
  // desmontar, igual que la vista previa de `BannerImageField`.
  useEffect(() => {
    if (!file) {
      setImgUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    setNaturalSize(null);
    setZoom(1);
    inicializadoRef.current = null;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Mide el marco al abrir y cuando cambia el tamaño de la ventana: el modal
  // es responsive y el ancho disponible cambia el `scaleCover`.
  useEffect(() => {
    if (!isOpen) return undefined;

    function medir() {
      const el = frameRef.current;
      if (el) setFrameSize({ width: el.clientWidth, height: el.clientHeight });
    }
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [isOpen]);

  // Centra la imagen la primera vez que se conocen su tamaño natural y el del
  // marco. Solo una vez por archivo: si se repite en cada medición de resize,
  // el zoom y el arrastre del admin se pierden cada vez que cambia el ancho.
  useEffect(() => {
    if (!naturalSize || !frameSize.width || inicializadoRef.current === file) return;
    const cover = Math.max(frameSize.width / naturalSize.width, frameSize.height / naturalSize.height);
    const dispW = naturalSize.width * cover;
    const dispH = naturalSize.height * cover;
    setOffset({ x: (frameSize.width - dispW) / 2, y: (frameSize.height - dispH) / 2 });
    inicializadoRef.current = file;
  }, [naturalSize, frameSize, file]);

  if (!isOpen) return null;

  const listo = Boolean(naturalSize && frameSize.width);
  const scaleCover = listo
    ? Math.max(frameSize.width / naturalSize.width, frameSize.height / naturalSize.height)
    : 0;
  const scale = scaleCover * zoom;
  const dispW = listo ? naturalSize.width * scale : 0;
  const dispH = listo ? naturalSize.height * scale : 0;

  function alCargarImagen(evento) {
    setNaturalSize({ width: evento.target.naturalWidth, height: evento.target.naturalHeight });
  }

  function alBajarPuntero(evento) {
    if (!listo) return;
    arrastreRef.current = {
      startX: evento.clientX,
      startY: evento.clientY,
      startOffset: offset,
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function alMoverPuntero(evento) {
    if (!arrastreRef.current) return;
    const { startX, startY, startOffset } = arrastreRef.current;
    const propuesto = {
      x: startOffset.x + (evento.clientX - startX),
      y: startOffset.y + (evento.clientY - startY),
    };
    setOffset(recortar(propuesto, dispW, dispH, frameSize.width, frameSize.height));
  }

  function alSoltarPuntero() {
    arrastreRef.current = null;
  }

  function cambiarZoom(evento) {
    const nuevoZoom = Number(evento.target.value);
    const nuevaScale = scaleCover * nuevoZoom;
    const nuevoDispW = naturalSize.width * nuevaScale;
    const nuevoDispH = naturalSize.height * nuevaScale;
    setZoom(nuevoZoom);
    setOffset((actual) => recortar(actual, nuevoDispW, nuevoDispH, frameSize.width, frameSize.height));
  }

  async function confirmar() {
    setProcesando(true);
    try {
      const cropW = frameSize.width / scale;
      const cropH = frameSize.height / scale;
      const cropX = -offset.x / scale;
      const cropY = -offset.y / scale;

      const outW = Math.min(MAX_OUTPUT_WIDTH, Math.round(cropW));
      const outH = Math.round(outW / RATIO);

      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgRef.current, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      onConfirm(new File([blob], nombreDeSalida(), { type: 'image/jpeg' }));
    } finally {
      setProcesando(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal fade show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bannerCropTitle"
        tabIndex={-1}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title h6" id="bannerCropTitle">
                Ajustar recorte
              </h2>
            </div>
            <div className="modal-body">
              <div
                ref={frameRef}
                className={styles.frame}
                onPointerDown={alBajarPuntero}
                onPointerMove={alMoverPuntero}
                onPointerUp={alSoltarPuntero}
                onPointerCancel={alSoltarPuntero}
              >
                {!listo && <div className={styles.placeholder}>Cargando…</div>}
                {imgUrl && (
                  <img
                    ref={imgRef}
                    src={imgUrl}
                    alt=""
                    draggable={false}
                    onLoad={alCargarImagen}
                    className={styles.image}
                    style={{
                      left: offset.x,
                      top: offset.y,
                      width: dispW || undefined,
                      height: dispH || undefined,
                      visibility: listo ? 'visible' : 'hidden',
                    }}
                  />
                )}
              </div>

              <div className="mt-3">
                <label htmlFor="bannerCropZoom" className="form-label small mb-1">
                  Zoom
                </label>
                <input
                  id="bannerCropZoom"
                  type="range"
                  className="form-range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={cambiarZoom}
                  disabled={!listo}
                />
              </div>

              <p className="form-text mb-0">
                Arrastrá la imagen para ubicarla y usá el zoom para acercar. El recorte queda en
                formato panorámico (21:9), igual que se ve en el carril.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={onCancel}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={confirmar}
                disabled={!listo || procesando}
              >
                {procesando ? 'Recortando…' : 'Usar esta imagen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
