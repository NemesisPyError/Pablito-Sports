import { Link, useNavigate, useParams } from 'react-router-dom';

import { ErrorState } from '../../../../shared/components/ErrorState.jsx';
import { LoadingState } from '../../../../shared/components/LoadingState.jsx';
import { UserForm } from '../components/UserForm.jsx';
import { useSaveUser, useUser } from '../hooks/useUsers.js';

/**
 * Alta y edición de administradores (05_API.md §9.14, 07_PANEL_ADMIN.md §14.9).
 *
 * Una sola pantalla para ambas: los campos difieren solo en la contraseña (solo
 * alta) y el estado activo (solo edición), y el formulario ya lo resuelve.
 */
export function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const esEdicion = Boolean(id);
  const userId = esEdicion ? Number.parseInt(id, 10) : null;

  const { data: usuario, isLoading, isError, refetch } = useUser(userId);
  const guardar = useSaveUser();

  if (esEdicion && isLoading) return <LoadingState message="Cargando usuario…" />;

  if (esEdicion && isError) {
    return (
      <ErrorState
        title="No pudimos cargar el usuario"
        message="Puede que ya no exista o que haya un problema de conexión."
        onRetry={refetch}
      />
    );
  }

  function enviar(payload) {
    guardar.mutate({ userId, payload }, { onSuccess: () => navigate('/admin/users') });
  }

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-3">
        <ol className="breadcrumb mb-0 small">
          <li className="breadcrumb-item">
            <Link to="/admin/users">Usuarios</Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {esEdicion ? usuario?.username : 'Nuevo'}
          </li>
        </ol>
      </nav>

      <h2 className="h5 mb-3">{esEdicion ? 'Editar usuario' : 'Nuevo usuario'}</h2>

      <div className="card">
        <div className="card-body">
          <UserForm
            key={usuario?.id ?? 'nuevo'}
            user={esEdicion ? usuario : null}
            onSubmit={enviar}
            onCancel={() => navigate('/admin/users')}
            saving={guardar.isPending}
            submitError={guardar.error}
          />
        </div>
      </div>

      {esEdicion && (
        <p className="form-text mt-3">
          La contraseña se cambia desde el botón «Contraseña» del listado, con su propia
          confirmación.
        </p>
      )}
    </>
  );
}
