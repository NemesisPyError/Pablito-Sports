import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { formatDateTime } from '../../../../shared/formatters/date.js';
import { useAdminAuth } from '../../../auth/index.js';
import { ChangePasswordForm } from '../components/ChangePasswordForm.jsx';
import { useChangePassword } from '../hooks/useUsers.js';
import { roleLabel } from '../utils/userForm.js';

/**
 * Mi cuenta (07_PANEL_ADMIN.md §8.1, `CU-A-27`).
 *
 * Cualquier administrador —no solo el superadministrador— puede cambiar su
 * propia contraseña. Por eso esta pantalla va tras `RequireAdminAuth` y no tras
 * `RequireSuperAdmin`, y usa `POST /users/{id}/change-password` con el propio id
 * (§9.14), que exige la contraseña actual.
 *
 * Cambiarla invalida la sesión (§7.3): al terminar se vuelve al login.
 */
export function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { administrator } = useAdminAuth();
  const cambiar = useChangePassword();

  if (!administrator) return null;

  function enviar({ currentPassword, newPassword }) {
    cambiar.mutate(
      { userId: administrator.id, currentPassword, newPassword, isSelf: true },
      {
        onSuccess: () => {
          queryClient.clear();
          navigate('/admin/login', { replace: true });
        },
      },
    );
  }

  return (
    <>
      <h2 className="h5 mb-3">Mi cuenta</h2>

      <div className="row g-3">
        <div className="col-12 col-lg-5">
          <div className="card">
            <div className="card-body">
              <dl className="row mb-0 small">
                <dt className="col-5 text-muted">Usuario</dt>
                <dd className="col-7">{administrator.username}</dd>
                <dt className="col-5 text-muted">Correo</dt>
                <dd className="col-7">{administrator.email}</dd>
                <dt className="col-5 text-muted">Rol</dt>
                <dd className="col-7">{roleLabel(administrator.role)}</dd>
                <dt className="col-5 text-muted">Último acceso</dt>
                <dd className="col-7">
                  {administrator.last_login_at
                    ? formatDateTime(administrator.last_login_at)
                    : 'Nunca'}
                </dd>
              </dl>
              {administrator.role !== 'super_administrator' && (
                <p className="form-text mb-0 mt-2">
                  Tu usuario y correo los administra el superadministrador.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="card">
            <div className="card-body">
              <h3 className="h6 mb-3">Cambiar contraseña</h3>
              <ChangePasswordForm
                requireCurrent
                onSubmit={enviar}
                saving={cambiar.isPending}
                submitError={cambiar.error}
                submitLabel="Cambiar contraseña"
                idPrefix="account-pwd"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
