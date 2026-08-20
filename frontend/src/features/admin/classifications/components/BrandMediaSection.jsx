import { useEffect, useState } from 'react';

import { brandMediaApi } from '../api/classificationsApi.js';

/**
 * Logotipo y collage de una marca (05_API.md §9.6, v1.1.0).
 *
 * Cada imagen se guarda **al instante**, por su propio recurso, y no con el
 * botón «Guardar» del formulario: el CRUD de la marca es JSON y meter archivos
 * ahí obligaría a reenviar el logotipo cada vez que se corrige el nombre.
 *
 * Solo aparece al editar: una marca que todavía no existe no tiene dónde
 * colgar sus archivos, y subirlos antes dejaría basura en el volumen si el
 * alta se cancela.
 */
export function BrandMediaSection({ brandId, logoUrl, maxImages = 4 }) {
  const [logo, setLogo] = useState(logoUrl ?? null);
  const [piezas, setPiezas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vigente = true;

    brandMediaApi
      .listImages(brandId)
      .then((datos) => {
        if (vigente) setPiezas(datos);
      })
      .catch(() => {
        if (vigente) setError('No se pudo cargar el collage.');
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [brandId]);

  async function ejecutar(accion, mensajeDeError) {
    setTrabajando(true);
    setError(null);
    try {
      await accion();
    } catch (fallo) {
      setError(fallo?.response?.data?.errors?.[0]?.detail ?? mensajeDeError);
    } finally {
      setTrabajando(false);
    }
  }

  function subirLogo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    const formData = new FormData();
    formData.append('image', archivo);
    ejecutar(async () => {
      const marca = await brandMediaApi.setLogo(brandId, formData);
      setLogo(marca?.image_url ?? null);
    }, 'No se pudo guardar el logotipo.');
  }

  function agregarPieza(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (!archivo) return;

    const formData = new FormData();
    formData.append('image', archivo);
    ejecutar(async () => {
      const pieza = await brandMediaApi.addImage(brandId, formData);
      setPiezas((actuales) => [...actuales, pieza]);
    }, 'No se pudo agregar la imagen.');
  }

  function mover(indice, salto) {
    const destino = indice + salto;
    if (destino < 0 || destino >= piezas.length) return;

    const reordenadas = [...piezas];
    [reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]];

    ejecutar(async () => {
      const devueltas = await brandMediaApi.reorderImages(
        brandId,
        reordenadas.map((pieza) => pieza.id),
      );
      setPiezas(devueltas);
    }, 'No se pudo reordenar el collage.');
  }

  function quitar(imageId) {
    ejecutar(async () => {
      await brandMediaApi.deleteImage(brandId, imageId);
      setPiezas((actuales) => actuales.filter((pieza) => pieza.id !== imageId));
    }, 'No se pudo quitar la imagen.');
  }

  const completo = piezas.length >= maxImages;

  return (
    <section className="card mt-3">
      <div className="card-body">
        <h2 className="h6 mb-3">Imágenes de portada</h2>

        {error && (
          <p className="text-danger small" role="alert">
            {error}
          </p>
        )}

        <div className="mb-4">
          <span className="form-label d-block">
            Logotipo <span className="text-muted fw-normal">(opcional)</span>
          </span>

          {logo && (
            <img
              src={logo}
              alt="Logotipo actual de la marca"
              className="d-block mb-2 rounded border bg-light p-2"
              style={{ maxWidth: '12rem', width: '100%' }}
            />
          )}

          <div className="d-flex flex-wrap align-items-center gap-2">
            <input
              type="file"
              className="form-control"
              style={{ maxWidth: '20rem' }}
              accept="image/jpeg,image/png,image/webp"
              onChange={subirLogo}
              disabled={trabajando}
              aria-label="Elegir el logotipo de la marca"
            />
            {logo && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() =>
                  ejecutar(async () => {
                    await brandMediaApi.deleteLogo(brandId);
                    setLogo(null);
                  }, 'No se pudo quitar el logotipo.')
                }
                disabled={trabajando}
              >
                Quitar logotipo
              </button>
            )}
          </div>
        </div>

        <div>
          <span className="form-label d-block">
            Collage <span className="text-muted fw-normal">(hasta {maxImages} imágenes)</span>
          </span>

          {cargando ? (
            <p className="form-text mb-0">Cargando…</p>
          ) : (
            <>
              {piezas.length === 0 && (
                <p className="form-text">
                  Sin imágenes todavía. El bloque de la marca no se publica hasta que tenga
                  suficientes.
                </p>
              )}

              <ul className="list-unstyled d-flex flex-wrap gap-3 mb-3">
                {piezas.map((pieza, indice) => (
                  <li key={pieza.id} className="border rounded p-2" style={{ width: '10rem' }}>
                    <img
                      src={pieza.image_url}
                      alt={pieza.alt_text ?? ''}
                      className="d-block mb-2 w-100 rounded"
                    />
                    <div className="d-flex justify-content-between gap-1">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => mover(indice, -1)}
                        disabled={trabajando || indice === 0}
                        aria-label={`Mover la imagen ${indice + 1} hacia atrás`}
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => mover(indice, 1)}
                        disabled={trabajando || indice === piezas.length - 1}
                        aria-label={`Mover la imagen ${indice + 1} hacia adelante`}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => quitar(pieza.id)}
                        disabled={trabajando}
                        aria-label={`Quitar la imagen ${indice + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <input
                type="file"
                className="form-control"
                style={{ maxWidth: '20rem' }}
                accept="image/jpeg,image/png,image/webp"
                onChange={agregarPieza}
                disabled={trabajando || completo}
                aria-label="Agregar una imagen al collage"
              />
              {completo && (
                <p className="form-text mb-0">
                  Ya hay {maxImages} imágenes. Quitá una para poder agregar otra.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
