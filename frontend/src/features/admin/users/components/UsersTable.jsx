import { Link } from 'react-router-dom';

import { formatDateTime } from '../../../../shared/formatters/date.js';
import { isLastActiveSuper, roleLabel } from '../utils/userForm.js';

/**
 * Tabla de administradores (07_PANEL_ADMIN.md §14.9).
 *
 * Muestra el estado tal como llega. Las reglas duras (`RN-71`, `RN-72`) las
 * impone el backend; aquí solo se deshabilita lo que se sabe que fallará —con
 * el motivo a la vista— para no ofrecer una acción que va a rebotar.
 *
 * La contraseña **nunca** se muestra ni se pide aquí: se cambia desde su propio
 * diálogo (03_SEGURIDAD.md §5.5).
 */
export function UsersTable({ users, currentUserId, onChangePassword, onDelete, busyId }) {
  return (
    <>
      {/* Escritorio */}
      <div className="table-responsive d-none d-lg-block">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Correo</th>
              <th scope="col">Rol</th>
              <th scope="col">Estado</th>
              <th scope="col">Último acceso</th>
              <th scope="col" className="text-end">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <Link to={`/admin/users/${user.id}`} className="fw-semibold">
                    {user.username}
                  </Link>
                  {user.id === currentUserId && (
                    <span className="badge text-bg-light border ms-2">vos</span>
                  )}
                </td>
                <td className="small">{user.email}</td>
                <td className="small">{roleLabel(user.role)}</td>
                <td>
                  <EstadoBadge active={user.is_active} />
                </td>
                <td className="small text-muted">
                  {user.last_login_at ? formatDateTime(user.last_login_at) : 'Nunca'}
                </td>
                <td className="text-end">
                  <Acciones
                    user={user}
                    users={users}
                    currentUserId={currentUserId}
                    busy={busyId === user.id}
                    onChangePassword={onChangePassword}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil y tablet */}
      <ul className="list-group d-lg-none">
        {users.map((user) => (
          <li key={user.id} className="list-group-item">
            <div className="d-flex justify-content-between align-items-start gap-2">
              <Link to={`/admin/users/${user.id}`} className="fw-semibold">
                {user.username}
                {user.id === currentUserId && (
                  <span className="badge text-bg-light border ms-2">vos</span>
                )}
              </Link>
              <EstadoBadge active={user.is_active} />
            </div>
            <p className="small text-muted mb-1">{user.email}</p>
            <p className="small text-muted mb-2">
              {roleLabel(user.role)} · último acceso:{' '}
              {user.last_login_at ? formatDateTime(user.last_login_at) : 'nunca'}
            </p>
            <Acciones
              user={user}
              users={users}
              currentUserId={currentUserId}
              busy={busyId === user.id}
              onChangePassword={onChangePassword}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

function EstadoBadge({ active }) {
  return (
    <span className={`badge text-bg-${active ? 'success' : 'secondary'}`}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

function Acciones({ user, users, currentUserId, busy, onChangePassword, onDelete }) {
  const esUltimoSuper = isLastActiveSuper(user, users);
  const esPropio = user.id === currentUserId;

  const motivoBloqueoBorrado = esPropio
    ? 'Un usuario no puede eliminarse a sí mismo (RN-72).'
    : esUltimoSuper
      ? 'No se puede eliminar al último superadministrador activo (RN-71).'
      : null;

  return (
    <div
      className="btn-group btn-group-sm"
      role="group"
      aria-label={`Acciones de ${user.username}`}
    >
      <Link to={`/admin/users/${user.id}`} className="btn btn-outline-secondary">
        Editar
      </Link>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={() => onChangePassword(user)}
        disabled={busy}
      >
        Contraseña
      </button>
      <button
        type="button"
        className="btn btn-outline-danger"
        onClick={() => onDelete(user)}
        disabled={busy || Boolean(motivoBloqueoBorrado)}
        title={motivoBloqueoBorrado ?? undefined}
      >
        Eliminar
      </button>
    </div>
  );
}
