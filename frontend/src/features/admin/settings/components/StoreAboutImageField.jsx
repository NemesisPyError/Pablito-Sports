import { useRef, useState } from 'react';

import { settingsApi } from '../api/settingsApi.js';

/**
 * Foto de «Nuestra historia» (05_API.md §9.12, v1.1.0).
 *
 * Se guarda **al instante y por su propio recurso**, no con el resto del
 * formulario: el `PUT` de configuración es JSON, y volverlo multipart obligaría
 * a reenviar las plantillas de WhatsApp cada vez que se cambia una imagen.
 *
 * Por eso tampoco participa del aviso de cambios sin guardar: cuando el
 * administrador la carga, ya quedó guardada.
 */
export function StoreAboutImageField({ imageUrl, disabled }) {
  const inputRef = useRef(null);
  const [actual, setActual] = useState(imageUrl);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState(null);

  async function ejecutar(accion) {
    setTrabajando(true);
    setError(null);
    try {
      const settings = await accion();
      setActual(settings?.about_image_url ?? null);
    } catch (fallo) {
      setError(fallo?.response?.data?.errors?.[0]?.detail ?? 'No se pudo guardar la imagen.');
    } finally {
      setTrabajando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function elegir(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    const formData = new FormData();
    formData.append('image', archivo);
    ejecutar(() => settingsApi.setAboutImage(formData));
  }

  const ocupado = disabled || trabajando;

  return (
    <div>
      <span className="form-label d-block">
        Foto <span className="text-muted fw-normal">(opcional)</span>
      </span>

      {actual && (
        <img
          src={actual}
          alt="Foto actual de la sección Nuestra historia"
          className="d-block mb-2 rounded border"
          style={{ maxWidth: '18rem', width: '100%' }}
        />
      )}

      <div className="d-flex flex-wrap align-items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          className="form-control"
          style={{ maxWidth: '20rem' }}
          accept="image/jpeg,image/png,image/webp"
          onChange={elegir}
          disabled={ocupado}
          aria-label="Elegir la foto de Nuestra historia"
        />

        {actual && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => ejecutar(() => settingsApi.deleteAboutImage())}
            disabled={ocupado}
          >
            Quitar foto
          </button>
        )}
      </div>

      <p className="form-text mb-0">Se guarda al elegirla, sin necesidad de tocar «Guardar».</p>

      {error && (
        <p className="text-danger small mt-2 mb-0" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
