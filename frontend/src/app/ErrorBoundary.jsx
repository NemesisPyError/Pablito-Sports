import { Component } from 'react';

/**
 * Límite de error genérico (06_FRONTEND.md §15).
 *
 * Captura errores de **renderizado** de su subárbol y muestra un fallback en
 * lugar de dejar caer toda la aplicación (§15.1). No captura errores de la API:
 * esos los manejan los hooks de consulta (§15.3).
 *
 * Props:
 * - `fallback`: nodo, o `({ error, reset }) => nodo`. Sin él, se usa el fallback
 *   de página completa de abajo (el de la raíz).
 * - `resetKeys`: array; si cambia mientras hay un error, el boundary se reinicia
 *   solo. Lo usa `RouteErrorBoundary` para recuperarse al navegar (§15.3).
 * - `onError(error, info)`: notificación opcional.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && !arraysIguales(prevProps.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback({ error: this.state.error, reset: this.reset });
    }
    if (fallback) return fallback;

    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-4">
        <div className="text-center">
          <h1 className="h4 mb-3">Algo salió mal</h1>
          <p className="text-muted mb-3">Ocurrió un error inesperado. Intentá recargar la página.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}

function arraysIguales(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((valor, indice) => Object.is(valor, b[indice]));
}
