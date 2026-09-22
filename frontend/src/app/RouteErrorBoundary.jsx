import { Link, useLocation } from 'react-router-dom';

import { ErrorBoundary } from './ErrorBoundary.jsx';

/**
 * Límite de error de sección (06_FRONTEND.md §15.2).
 *
 * Envuelve una rama de la app (carrito, ficha de producto, panel) para que un
 * error de renderizado ahí **no derribe el resto** — el navbar, el footer y las
 * demás secciones siguen respondiendo. Al cambiar de ruta el boundary se
 * reinicia solo (`resetKeys`), de modo que navegar a otra pantalla ya sirve
 * como recuperación aunque el error de origen fuera permanente (§15.3).
 *
 * El fallback ofrece "Reintentar" (para errores transitorios) y un enlace de
 * salida contextual.
 */
export function RouteErrorBoundary({
  title = 'No pudimos mostrar esta sección',
  homeTo = '/',
  homeLabel = 'Volver al inicio',
  children,
}) {
  const { pathname } = useLocation();

  return (
    <ErrorBoundary
      resetKeys={[pathname]}
      fallback={({ reset }) => (
        <div className="text-center py-5" role="alert" aria-live="assertive">
          <p className="fw-semibold mb-2">{title}</p>
          <p className="text-muted small mb-3">
            El resto del sitio sigue funcionando. Podés reintentar o volver e ingresar de nuevo.
          </p>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={reset}>
              Reintentar
            </button>
            <Link to={homeTo} className="btn btn-outline-secondary btn-sm">
              {homeLabel}
            </Link>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
