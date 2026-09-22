import { useEffect, useRef, useState } from 'react';

import {
  clampOffset,
  coverScale,
  cropRect,
  imageRatio,
  MAX_ZOOM,
  MIN_ZOOM,
  outputSize,
} from '../utils/bannerCropMath.js';
import styles from './BannerImageCropModal.module.css';

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
 * Editor de recorte del banner — modo "Ajustar / Recortar" (v2.9.4, pedido
 * explícito del usuario). Deja arrastrar y hacer zoom dentro de un marco que
 * respeta la **proporción real de la imagen elegida**, no un formato fijo:
 * hasta v2.9.3 el marco era 21:9 siempre, forzando a toda imagen (vertical,
 * cuadrada, panorámica) a esa forma. El marco ahora se calcula de
 * `naturalSize` (ancho/alto del archivo) apenas se conoce — la matemática
 * vive en `bannerCropMath.js`, separada para poder probarla sin montar React.
 *
 * Con zoom en 1 y sin arrastrar, el marco ya muestra la imagen completa —
 * "recortar" acá es literalmente "acercarse", nunca cambia la forma del
 * encuadre. No es un editor de crop libre con bordes redimensionables (pedido
 * explícito del usuario: fuera de alcance).
 *
 * Esta pantalla es opcional: `BannerImageField` solo la abre si el
 * administrador elige "Ajustar / Recortar". Si elige "Usar imagen completa"
 * no pasa por acá — el archivo original se sube tal cual, sin canvas ni
 * reconversión (ver nota en `BannerImageField.jsx`).
 *
 * El recorte se resuelve en el navegador (canvas) y se sube ya la imagen
 * final: el backend no recorta a propósito (`local_storage.py`, §17.1.2 —
 * decidir el encuadre es tarea de quien carga la foto).
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
  const ratio = imageRatio(naturalSize);

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
  // es responsive y el ancho disponible cambia el `scaleCover`. También
  // depende de `ratio`: el marco cambia de alto apenas se conoce el tamaño
  // real de la imagen, y hay que remedir tras ese cambio de layout.
  useEffect(() => {
    if (!isOpen) return undefined;

    function medir() {
      const el = frameRef.current;
      if (el) setFrameSize({ width: el.clientWidth, height: el.clientHeight });
    }
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [isOpen, ratio]);

  // Centra la imagen la primera vez que se conocen su tamaño natural y el del
  // marco. Solo una vez por archivo: si se repite en cada medición de resize,
  // el zoom y el arrastre del admin se pierden cada vez que cambia el ancho.
  useEffect(() => {
    if (!naturalSize || !frameSize.width || inicializadoRef.current === file) return;
    const cover = coverScale(frameSize, naturalSize);
    const dispW = naturalSize.width * cover;
    const dispH = naturalSize.height * cover;
    setOffset({ x: (frameSize.width - dispW) / 2, y: (frameSize.height - dispH) / 2 });
    inicializadoRef.current = file;
  }, [naturalSize, frameSize, file]);

  if (!isOpen) return null;

  const listo = Boolean(naturalSize && frameSize.width);
  const scaleCover = listo ? coverScale(frameSize, naturalSize) : 0;
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
    setOffset(clampOffset(propuesto, dispW, dispH, frameSize.width, frameSize.height));
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
    setOffset((actual) =>
      clampOffset(actual, nuevoDispW, nuevoDispH, frameSize.width, frameSize.height),
    );
  }

  async function confirmar() {
    setProcesando(true);
    try {
      const { cropW, cropH, cropX, cropY } = cropRect({ frameSize, scale, offset });
      const { outW, outH } = outputSize({ cropW, cropH });

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
                Ajustar / Recortar
              </h2>
            </div>
            <div className="modal-body">
              <div
                ref={frameRef}
                className={styles.frame}
                style={{ aspectRatio: ratio }}
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
                Arrastrá la imagen para ubicarla y usá el zoom para acercar. El marco respeta la
                proporción de tu imagen — sin zoom, se ve completa.
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
                {procesando ? 'Aplicando…' : 'Aplicar recorte'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
