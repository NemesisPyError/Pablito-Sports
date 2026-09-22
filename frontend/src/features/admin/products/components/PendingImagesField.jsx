import { useEffect, useRef, useState } from 'react';

/**
 * Fotos a subir al crear un producto (07_PANEL_ADMIN.md §14.3, pedido del
 * administrador, 2026-08-19): el producto todavía no existe, así que acá solo
 * se juntan archivos con una vista previa local — la subida real pasa recién
 * después de crear el producto, contra `POST /admin/products/<id>/images`
 * (`ProductForm`, modo alta).
 *
 * Sin recorte y sin galería (reordenar, marcar principal): eso vive en
 * `ImagesSection.jsx`, que `ProductForm` usa en su lugar al editar, una vez
 * que el producto y sus imágenes ya existen.
 */
export function PendingImagesField({ files, onChange, disabled, fallidos = [] }) {
  const inputRef = useRef(null);
  const [previews, setPreviews] = useState([]);

  useEffect(() => {
    const urls = files.map((archivo) => URL.createObjectURL(archivo));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  function alSeleccionar(evento) {
    const elegidos = Array.from(evento.target.files ?? []);
    if (elegidos.length > 0) onChange([...files, ...elegidos]);
    evento.target.value = '';
  }

  function quitar(indice) {
    onChange(files.filter((_, i) => i !== indice));
  }

  return (
    <div>
      <span className="form-label d-block">
        Imágenes <span className="text-muted fw-normal">(opcional)</span>
      </span>

      {files.length > 0 && (
        <div className="row g-2 row-cols-3 row-cols-md-4 mb-2">
          {files.map((archivo, indice) => (
            <div className="col" key={`${archivo.name}-${archivo.lastModified}-${indice}`}>
              <div className="card h-100">
                <div className="ratio ratio-1x1 bg-light">
                  {previews[indice] && (
                    <img
                      src={previews[indice]}
                      alt=""
                      className="w-100 h-100 object-fit-cover"
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm w-100 rounded-0"
                  onClick={() => quitar(indice)}
                  disabled={disabled}
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fallidos.length > 0 && (
        <div className="alert alert-warning py-2 small" role="alert">
          <p className="mb-1 fw-semibold">
            El producto se creó, pero no pudimos subir estas imágenes:
          </p>
          <ul className="mb-0 ps-3">
            {fallidos.map(({ nombre, error }) => (
              <li key={nombre}>
                {nombre} — {mensajeDeCarga(error)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="d-none"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={alSeleccionar}
        disabled={disabled}
      />
      <button
        type="button"
        className="btn btn-outline-primary btn-sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {files.length > 0 ? 'Agregar más' : 'Elegir imágenes'}
      </button>
      <p className="form-text mb-0 mt-1">Se suben junto con el producto al guardar.</p>
    </div>
  );
}

/** Traduce el código del contrato, nunca el mensaje del servidor (`ERR-04`). */
function mensajeDeCarga(error) {
  if (error?.status === 429) return 'hay demasiadas solicitudes, esperá un momento y volvé a intentar';
  if (error?.status === 422) return 'formato o dimensiones no admitidos';
  if (error?.status === 413) return 'el archivo supera el tamaño máximo';
  if (error?.isNetworkFailure) return 'no pudimos conectar con el servidor';
  return 'error inesperado';
}
