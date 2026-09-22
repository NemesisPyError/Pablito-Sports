import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { ConfirmDialog } from '../../../../shared/components/ConfirmDialog.jsx';
import { EmptyState } from '../../../../shared/components/EmptyState.jsx';
import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { RATE_LIMIT_MESSAGE } from '../../../../shared/services/errorMessages.js';
import { useAdminAuth } from '../../../auth/index.js';
import { ChangePasswordDialog } from '../components/ChangePasswordDialog.jsx';
import { UsersTable } from '../components/UsersTable.jsx';
import { useChangePassword, useDeleteUser, useUsers } from '../hooks/useUsers.js';

/**
 * Listado de administradores (07_PANEL_ADMIN.md §14.9, 05_API.md §9.14).
 *
 * Solo la alcanza el superadministrador: la ruta va tras `RequireSuperAdmin` y
 * el backend responde `403` a cualquier llamada sin ese rol (`PA-06`).
 */
export function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { administrator } = useAdminAuth();
  const { data, isLoading, isError, error, refetch } = useUsers();

  const eliminar = useDeleteUser();
  const cambiarContrasena = useChangePassword();

  const [aEliminar, setAEliminar] = useState(null);
  const [aCambiarContrasena, setACambiarContrasena] = useState(null);
  const [errorAccion, setErrorAccion] = useState(null);

  const usuarios = useMemo(() => data?.items ?? [], [data]);
  const total = data?.meta?.total ?? usuarios.length;
  const hayMasEnElServidor = total > usuarios.length;

  if (isError) {
    return (
      <ErrorState
        title="No pudimos cargar los usuarios"
        message="Revisá tu conexión e intentá de nuevo."
        error={error}
        onRetry={refetch}
      />
    );
  }

  function confirmarBorrado() {
    setErrorAccion(null);
    eliminar.mutate(aEliminar.id, {
      onError: (error) => setErrorAccion(error),
      onSettled: () => setAEliminar(null),
    });
  }

  function abrirCambioContrasena(user) {
    cambiarContrasena.reset();
    setACambiarContrasena(user);
  }

  function cerrarCambioContrasena() {
    cambiarContrasena.reset();
    setACambiarContrasena(null);
  }

  function enviarContrasena({ currentPassword, newPassword }) {
    const objetivo = aCambiarContrasena;
    const esPropia = objetivo.id === administrator?.id;
    cambiarContrasena.mutate(
      { userId: objetivo.id, currentPassword, newPassword, isSelf: esPropia },
      {
        onSuccess: () => {
          cerrarCambioContrasena();
          if (esPropia) {
            // §7.3: el backend ya cerró la sesión. Nada del panel debe sobrevivir.
            queryClient.clear();
            navigate('/admin/login', { replace: true });
          }
        },
      },
    );
  }

  return (
    <>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h2 className="h5 mb-0">
          Usuarios
          <span className="text-muted fw-normal ms-2 small">({usuarios.length})</span>
        </h2>
        <Link to="/admin/users/new" className="btn btn-primary btn-sm">
          Nuevo usuario
        </Link>
      </div>

      {hayMasEnElServidor && (
        <div className="alert alert-warning py-2 small" role="alert">
          Se muestran los primeros {usuarios.length} de {total} usuarios.
        </div>
      )}

      {errorAccion && (
        <div className="alert alert-danger py-2 small" role="alert">
          {errorAccion.status === 409
            ? 'No se puede eliminar: dejaría el sistema sin un superadministrador válido.'
            : errorAccion.status === 429
              ? RATE_LIMIT_MESSAGE
              : 'No pudimos eliminar el usuario. Intentá de nuevo.'}
        </div>
      )}

      {isLoading ? (
        <LoadingState message="Cargando usuarios…" />
      ) : usuarios.length === 0 ? (
        <EmptyState
          title="Todavía no hay otros usuarios"
          message="Creá una cuenta para sumar a otra persona a la administración."
          actionLabel="Nuevo usuario"
          onAction={() => navigate('/admin/users/new')}
        />
      ) : (
        <UsersTable
          users={usuarios}
          currentUserId={administrator?.id}
          busyId={eliminar.variables}
          onChangePassword={abrirCambioContrasena}
          onDelete={setAEliminar}
        />
      )}

      <ConfirmDialog
        isOpen={Boolean(aEliminar)}
        title="Eliminar usuario"
        message={
          aEliminar
            ? `La cuenta "${aEliminar.username}" se eliminará y se cerrarán sus sesiones.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        busy={eliminar.isPending}
        onConfirm={confirmarBorrado}
        onCancel={() => setAEliminar(null)}
      />

      <ChangePasswordDialog
        isOpen={Boolean(aCambiarContrasena)}
        user={aCambiarContrasena}
        isSelf={aCambiarContrasena?.id === administrator?.id}
        saving={cambiarContrasena.isPending}
        error={cambiarContrasena.error}
        onSubmit={enviarContrasena}
        onCancel={cerrarCambioContrasena}
      />
    </>
  );
}
