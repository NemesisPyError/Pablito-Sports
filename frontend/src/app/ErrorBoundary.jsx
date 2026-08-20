import { Component } from 'react';

/**
 * Límite de error raíz.
 *
 * 06_FRONTEND.md §15: captura errores de renderizado y muestra fallback amigable.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center p-4">
          <div className="text-center">
            <h1 className="h4 mb-3">Algo salió mal</h1>
            <p className="text-muted mb-3">
              Ocurrió un error inesperado. Intentá recargar la página.
            </p>
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

    return this.props.children;
  }
}
