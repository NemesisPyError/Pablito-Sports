import { useCallback, useEffect, useRef, useState } from 'react';

import { ErrorState } from '../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../shared/components/LoadingState.jsx';
import { useTurnstileStatus } from '../hooks/useTurnstileStatus.js';
import { turnstileService } from '../services/turnstileService.js';
import { loadTurnstileScript } from '../utils/loadTurnstileScript.js';
import styles from './TurnstileGate.module.css';

/**
 * Verificación de Cloudflare Turnstile en el acceso a la tienda.
 *
 * Envuelve `PublicRoutes` en `App.jsx`, por encima de `PublicLayout`: nada
 * de la tienda se monta hasta que este componente decida que no hace falta
 * (`required: false`, la configuración explícita de desarrollo) o que ya se
 * verificó — ni antes ni ahora, la aprobación real la da el backend
 * (`TurnstileService.verify`, que llama a Cloudflare), nunca la sola
 * presencia de un token en el navegador.
 */
export function TurnstileGate({ children }) {
  const estado = useTurnstileStatus();
  // Una vez que el backend confirma el token, el gate no vuelve a mostrarse
  // en esta visita aunque `estado` se revalide en segundo plano —
  // "no pedir la verificación innecesariamente en cada interacción".
  const [verificadoLocalmente, setVerificadoLocalmente] = useState(false);

  const alVerificar = useCallback(() => setVerificadoLocalmente(true), []);

  if (estado.isLoading) {
    return <LoadingState message="Cargando tienda…" />;
  }

  if (estado.isError) {
    return (
      <ErrorState
        title="No pudimos verificar el acceso"
        error={estado.error}
        onRetry={estado.refetch}
      />
    );
  }

  const yaVerificado = !estado.data.required || estado.data.verified || verificadoLocalmente;
  if (yaVerificado) {
    return children;
  }

  return <TurnstileChallenge onVerified={alVerificar} />;
}

/** Widget de Turnstile propiamente dicho, aislado para que `TurnstileGate` no cargue el script de Cloudflare hasta saber que hace falta. */
function TurnstileChallenge({ onVerified }) {
  // Leída en cada render, no como constante de módulo: así un valor fijado
  // en tiempo de build/arranque del contenedor (`docker-compose.yml`) llega
  // siempre actualizado, sin depender de cuándo se evaluó este módulo por
  // primera vez.
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const contenedorRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [error, setError] = useState(null);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (!siteKey) {
      // El backend dijo `required: true` pero el frontend no tiene site key:
      // configuración a medias (ver `core/config/base.py::validate`, que
      // debería haber evitado justamente esto en producción). No hay widget
      // que dibujar, así que se avisa en vez de fallar en silencio.
      setError('La verificación no está disponible en este momento.');
      return undefined;
    }

    let cancelado = false;

    loadTurnstileScript()
      .then((turnstile) => {
        if (cancelado || !contenedorRef.current) return;
        widgetIdRef.current = turnstile.render(contenedorRef.current, {
          sitekey: siteKey,
          theme: 'auto',
          callback: (token) => {
            setError(null);
            setVerificando(true);
            turnstileService
              .verify(token)
              .then(() => {
                if (!cancelado) onVerified();
              })
              .catch(() => {
                if (cancelado) return;
                setVerificando(false);
                setError('No pudimos confirmar la verificación. Probá de nuevo.');
                // RN-turnstile: Cloudflare invalida el token usado (éxito o no),
                // así que un reintento necesita un token nuevo, no reenviar el
                // mismo — `reset` le pide al widget que lo resuelva de vuelta.
                turnstile.reset(widgetIdRef.current);
              });
          },
          'error-callback': () => {
            setVerificando(false);
            setError('La verificación falló. Probá de nuevo.');
          },
          'expired-callback': () => {
            setVerificando(false);
            setError('La verificación expiró. Probá de nuevo.');
          },
        });
      })
      .catch(() => {
        if (!cancelado) setError('No pudimos cargar la verificación de Cloudflare.');
      });

    return () => {
      cancelado = true;
      if (window.turnstile && widgetIdRef.current != null) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerified, siteKey]);

  return (
    <div className={styles.page}>
      <div className={styles.card} role="status" aria-live="polite">
        <p className={styles.brand}>
          Pablito<span className={styles.brandMark}>Sports</span>
        </p>
        <h1 className={styles.title}>Verificación de seguridad</h1>
        <p className={styles.description}>Confirmá que sos una persona para entrar a la tienda.</p>

        {error && <p className={styles.error}>{error}</p>}
        {verificando && !error && <p className={styles.status}>Confirmando…</p>}

        <div className={styles.widget} ref={contenedorRef} />

        {error && siteKey && (
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setError(null);
              if (window.turnstile && widgetIdRef.current != null) {
                window.turnstile.reset(widgetIdRef.current);
              }
            }}
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
