import { useRef, useState } from 'react';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { Image } from '../../../../shared/components/Image.jsx';
import {
  useDeleteImage,
  useProductImages,
  useReorderImages,
  useSetPrimaryImage,
  useUploadImage,
} from '../hooks/useProductMedia.js';

/**
 * Galería del producto (07_PANEL_ADMIN.md §14.3, 05_API.md §9.3).
 *
 * `RN-20`: hay exactamente una imagen principal. La carga es
 * `multipart/form-data` y el backend devuelve la URL del derivado canónico, que
 * es lo único que se muestra: el original no tiene ruta pública (`AD-38`).
 */
export function ImagesSection({ productId }) {
  const { data: imagenes, isLoading, isError, refetch } = useProductImages(productId);
  const subir = useUploadImage(productId);
  const marcarPrincipal = useSetPrimaryImage(productId);
  const eliminar = useDeleteImage(productId);
  const reordenar = useReorderImages(productId);

  const inputRef = useRef(null);
  const [aEliminar, setAEliminar] = useState(null);
  const [errores, setErrores] = useState([]);

  function alSeleccionar(evento) {
    const archivos = Array.from(evento.target.files ?? []);
    setErrores([]);

    // Se suben de a una: cada carga es una petición propia, y así un archivo
    // rechazado no arrastra a los demás.
    archivos.forEach((archivo) => {
      subir.mutate(archivo, {
        onError: (error) => {
          setErrores((previos) => [...previos, { nombre: archivo.name, error }]);
        },
      });
    });

    // Permite volver a elegir el mismo archivo tras un fallo.
    evento.target.value = '';
  }

  const items = imagenes ?? [];

  /** Intercambia con la vecina y manda el orden completo (§9.3). */
  function mover(indice, delta) {
    const destino = indice + delta;
    if (destino < 0 || destino >= items.length) return;
    const orden = items.map((imagen) => imagen.id);
    [orden[indice], orden[destino]] = [orden[destino], orden[indice]];
    reordenar.mutate(orden);
  }

  return (
    <section className="card mb-3">
      <div className="card-header bg-white d-flex align-items-center justify-content-between">
        <h2 className="h6 mb-0">Imágenes</h2>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="d-none"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={alSeleccionar}
          />
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            onClick={() => inputRef.current?.click()}
            disabled={subir.isPending}
          >
            {subir.isPending ? 'Subiendo…' : 'Subir imágenes'}
          </button>
        </div>
      </div>

      <div className="card-body">
        {errores.length > 0 && (
          <div className="alert alert-danger py-2 small" role="alert">
            <p className="mb-1 fw-semibold">No pudimos subir algunas imágenes:</p>
            <ul className="mb-0 ps-3">
              {errores.map(({ nombre, error }) => (
                <li key={nombre}>
                  {nombre} — {mensajeDeCarga(error)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isError ? (
          <div className="text-center py-3">
            <p className="small text-muted mb-2">No pudimos cargar las imágenes.</p>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={refetch}>
              Reintentar
            </button>
          </div>
        ) : isLoading ? (
          <div className="row g-3 row-cols-2 row-cols-md-4" aria-hidden="true">
            {Array.from({ length: 4 }, (_, indice) => (
              <div className="col" key={indice}>
                <div className="ratio ratio-1x1 bg-light rounded placeholder-glow">
                  <span className="placeholder w-100 h-100" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="Sin imágenes"
            message="Este producto todavía no tiene imágenes cargadas."
          />
        ) : (
          <div className="row g-3 row-cols-2 row-cols-md-4">
            {items.map((imagen, indice) => (
              <div className="col" key={imagen.id}>
                <div className={`card h-100 ${imagen.is_primary ? 'border-primary' : ''}`}>
                  <Image
                    src={imagen.image_url}
                    alt={imagen.alt_text || 'Imagen del producto'}
                    aspectRatio="1 / 1"
                    className="card-img-top"
                  />
                  <div className="card-body p-2">
                    {/* §9.3: el orden se envía completo, no por imagen suelta. */}
                    {items.length > 1 && (
                      <div className="btn-group btn-group-sm w-100 mb-2" role="group">
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => mover(indice, -1)}
                          disabled={indice === 0 || reordenar.isPending}
                          aria-label="Mover antes"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => mover(indice, 1)}
                          disabled={indice === items.length - 1 || reordenar.isPending}
                          aria-label="Mover después"
                        >
                          →
                        </button>
                      </div>
                    )}
                    {imagen.is_primary ? (
                      <span className="badge text-bg-primary w-100 mb-2">Principal</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm w-100 mb-2"
                        onClick={() => marcarPrincipal.mutate(imagen.id)}
                        disabled={marcarPrincipal.isPending}
                      >
                        Marcar principal
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm w-100"
                      onClick={() => setAEliminar(imagen)}
                      disabled={eliminar.isPending}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar imagen"
        // 07 §11: la confirmación enuncia la consecuencia.
        message="La imagen dejará de mostrarse en el catálogo."
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={() => eliminar.mutate(aEliminar.id, { onSettled: () => setAEliminar(null) })}
        onCancel={() => setAEliminar(null)}
      />
    </section>
  );
}

/** Traduce el código del contrato, nunca el mensaje del servidor (`ERR-04`). */
function mensajeDeCarga(error) {
  if (error?.status === 422) {
    // 03_SEGURIDAD.md §11.1: formato, dimensiones o contenido no admitidos.
    return 'formato o dimensiones no admitidos';
  }
  if (error?.status === 413) {
    return 'el archivo supera el tamaño máximo';
  }
  if (error?.isNetworkFailure) {
    return 'no pudimos conectar con el servidor';
  }
  return 'error inesperado';
}
