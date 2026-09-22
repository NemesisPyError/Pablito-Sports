const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

let cargaEnCurso = null;

/**
 * Carga el script oficial de Cloudflare Turnstile una sola vez.
 *
 * No hay un `<script>` fijo en `index.html` a propósito: sin
 * `VITE_TURNSTILE_SITE_KEY` configurada (desarrollo sin credenciales) la
 * tienda no debe pedirle nada a Cloudflare. `TurnstileGate` solo llama a
 * esto cuando el backend ya dijo `required: true`.
 */
export function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (cargaEnCurso) return cargaEnCurso;

  cargaEnCurso = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve(window.turnstile));
    script.addEventListener('error', () => {
      cargaEnCurso = null;
      reject(new Error('No se pudo cargar Cloudflare Turnstile'));
    });
    document.head.appendChild(script);
  });

  return cargaEnCurso;
}
