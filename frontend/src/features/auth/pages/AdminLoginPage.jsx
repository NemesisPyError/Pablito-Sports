import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAdminAuth, useAdminLogin } from '../hooks/useAdminAuth.js';
import styles from './AdminLoginPage.module.css';

/**
 * Acceso al panel (07_PANEL_ADMIN.md §6.1, 05_API.md §9.1).
 *
 * El detalle del fallo nunca distingue entre usuario inexistente y contraseña
 * incorrecta: 03_SEGURIDAD.md §16.1 lo prohíbe, y el backend ya responde igual
 * en ambos casos.
 *
 * 09/09/2026 (pedido del usuario): superficie azul profunda y logotipo. Es la
 * única pantalla oscura del producto —no pertenece al catálogo ni al panel— y
 * el color la separa de ambos. El logotipo es el mismo de la sidebar y del
 * catálogo: la identidad de Pablito Sports es tipográfica, no un archivo de
 * imagen, así que se compone con texto y no puede quedar desincronizado de las
 * otras dos pantallas donde ya aparece.
 *
 * Solo cambió la presentación: el envío, el manejo de error y la redirección
 * son exactamente los de antes.
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
    <main className={styles.page}>
      <div className={styles.shell}>
        {/* El `h1` es el logotipo: en esta pantalla no hay otro título, y darle
            uno aparte dejaría dos encabezados compitiendo por el mismo sitio. */}
        <h1 className={styles.brand}>
          <span className={styles.brandName}>
            Pablito<span className={styles.brandMark}>Sports</span>
          </span>
          <span className={styles.brandTag}>Panel administrativo</span>
        </h1>

        <div className={styles.card}>
          <form onSubmit={enviar} noValidate>
            <div className={styles.group}>
              <label htmlFor="username" className={styles.label}>
                Usuario
              </label>
              <input
                id="username"
                className={styles.field}
                autoComplete="username"
                required
                value={credenciales.username}
                onChange={actualizar('username')}
              />
            </div>

            <div className={styles.group}>
              <label htmlFor="password" className={styles.label}>
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className={styles.field}
                autoComplete="current-password"
                required
                value={credenciales.password}
                onChange={actualizar('password')}
              />
            </div>

            {login.isError && (
              <div className={styles.error} role="alert">
                {mensajeDeError(login.error)}
              </div>
            )}

            <button
              type="submit"
              className={styles.submit}
              disabled={login.isPending || !credenciales.username || !credenciales.password}
            >
              {login.isPending ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className={styles.footnote}>Acceso restringido al personal autorizado.</p>
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
