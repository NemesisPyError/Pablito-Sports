import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAdminAuth, useAdminLogin } from '../hooks/useAdminAuth.js';

/**
 * Acceso al panel (07_PANEL_ADMIN.md §6.1, 05_API.md §9.1).
 *
 * El detalle del fallo nunca distingue entre usuario inexistente y contraseña
 * incorrecta: 03_SEGURIDAD.md §16.1 lo prohíbe, y el backend ya responde igual
 * en ambos casos.
 */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAdminAuth();
  const login = useAdminLogin();

  const [credenciales, setCredenciales] = useState({ username: '', password: '' });

  const destino = location.state?.from ?? '/admin/dashboard';

  if (!isLoading && isAuthenticated) {
    return <Navigate to={destino} replace />;
  }

  function actualizar(campo) {
    return (evento) => setCredenciales((previo) => ({ ...previo, [campo]: evento.target.value }));
  }

  function enviar(evento) {
    evento.preventDefault();
    login.mutate(credenciales, {
      onSuccess: () => navigate(destino, { replace: true }),
    });
  }

  return (
    <main className="min-vh-100 d-flex align-items-center justify-content-center bg-light p-3">
      <div className="card shadow-sm w-100" style={{ maxWidth: '24rem' }}>
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Pablito Sports</h1>
          <p className="text-muted small mb-4">Panel administrativo</p>

          <form onSubmit={enviar} noValidate>
            <div className="mb-3">
              <label htmlFor="username" className="form-label">
                Usuario
              </label>
              <input
                id="username"
                className="form-control"
                autoComplete="username"
                required
                value={credenciales.username}
                onChange={actualizar('username')}
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                autoComplete="current-password"
                required
                value={credenciales.password}
                onChange={actualizar('password')}
              />
            </div>

            {login.isError && (
              <div className="alert alert-danger py-2 small" role="alert">
                {mensajeDeError(login.error)}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={login.isPending || !credenciales.username || !credenciales.password}
            >
              {login.isPending ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

/** Traduce el código estable del contrato, nunca el mensaje del servidor (`ERR-04`). */
function mensajeDeError(error) {
  if (error?.status === 429) {
    // 03_SEGURIDAD.md §14.1: 5 intentos cada 15 minutos por IP.
    return 'Demasiados intentos. Esperá unos minutos antes de volver a probar.';
  }
  if (error?.status === 401) {
    return 'Usuario o contraseña incorrectos.';
  }
  if (error?.isNetworkFailure) {
    return 'No pudimos conectar con el servidor.';
  }
  return 'No pudimos iniciar sesión. Intentá de nuevo.';
}
