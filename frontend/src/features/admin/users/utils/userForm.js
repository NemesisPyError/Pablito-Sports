/**
 * Conversión entre el DTO y el formulario, y validación de entrada.
 *
 * Lógica pura, separada de los componentes: así se prueba sin montar React,
 * que es lo único que el proyecto testea hoy (mismo criterio que
 * `promotionForm.js`). Replica lo que el backend ya exige (05_API.md §10.10,
 * 03_SEGURIDAD.md §5.5) para avisar antes de la petición; el servidor sigue
 * siendo quien decide.
 */

// 03_SEGURIDAD.md §5.5: mínimo 12 caracteres. Es la comprobación barata que se
// puede hacer acá; el rechazo de contraseñas triviales y el tope de 72 bytes de
// bcrypt los aplica el servidor, que es quien decide.
export const MIN_PASSWORD_LENGTH = 12;

// 04_BASE_DATOS.md §9.2.13.
const MAX_USERNAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;

// Comprobación deliberadamente laxa, igual que en el backend: el formato fino
// del correo no se valida con una expresión regular, se valida usándolo.
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const ROLES = [
  { value: 'administrator', label: 'Administrador' },
  { value: 'super_administrator', label: 'Superadministrador' },
];

export function roleLabel(role) {
  return ROLES.find((opcion) => opcion.value === role)?.label ?? role;
}

/** Estado inicial del formulario a partir de un `AdministratorDTO`, o vacío. */
export function toFormValues(user) {
  if (!user) {
    return { username: '', email: '', role: 'administrator', is_active: true, password: '' };
  }
  return {
    username: user.username ?? '',
    email: user.email ?? '',
    role: user.role ?? 'administrator',
    is_active: Boolean(user.is_active),
    // La contraseña no se carga nunca: en edición tiene su propio flujo (§9.14).
    password: '',
  };
}

/** Motivo por el que una contraseña no cumple la política, o `null` si cumple. */
export function passwordProblem(password) {
  if (!password) return 'La contraseña es obligatoria.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

/**
 * Valida el formulario de alta/edición. En edición (`isEdit`) la contraseña no
 * entra: `AdministratorUpdateDTO` no la contempla (§10.10).
 */
export function validateUser(values, { isEdit = false } = {}) {
  const errores = {};

  const username = values.username?.trim() ?? '';
  if (!username) {
    errores.username = 'El nombre de usuario es obligatorio.';
  } else if (username.length > MAX_USERNAME_LENGTH) {
    errores.username = `No puede superar los ${MAX_USERNAME_LENGTH} caracteres.`;
  }

  const email = values.email?.trim() ?? '';
  if (!email) {
    errores.email = 'El correo es obligatorio.';
  } else if (email.length > MAX_EMAIL_LENGTH) {
    errores.email = `No puede superar los ${MAX_EMAIL_LENGTH} caracteres.`;
  } else if (!EMAIL_PATTERN.test(email)) {
    errores.email = 'El correo no tiene un formato válido.';
  }

  if (!ROLES.some((opcion) => opcion.value === values.role)) {
    errores.role = 'Elegí un rol.';
  }

  if (!isEdit) {
    const problema = passwordProblem(values.password);
    if (problema) errores.password = problema;
  }

  return errores;
}

/**
 * Valida el cambio de contraseña. `requireCurrent` es `true` cuando el objetivo
 * es la propia cuenta: §9.14 exige `current_password` solo en ese caso.
 */
export function validatePasswordChange(values, { requireCurrent = false } = {}) {
  const errores = {};

  if (requireCurrent && !values.currentPassword) {
    errores.currentPassword = 'Ingresá tu contraseña actual.';
  }

  const problema = passwordProblem(values.newPassword);
  if (problema) errores.newPassword = problema;

  if (values.confirmPassword !== values.newPassword) {
    errores.confirmPassword = 'Las contraseñas no coinciden.';
  }

  return errores;
}

/** `AdministratorCreateDTO` (§10.10). */
export function toCreatePayload(values) {
  return {
    username: values.username.trim(),
    email: values.email.trim(),
    role: values.role,
    password: values.password,
  };
}

/** `AdministratorUpdateDTO` (§10.10). Reemplazo completo del perfil, sin contraseña. */
export function toUpdatePayload(values) {
  return {
    username: values.username.trim(),
    email: values.email.trim(),
    role: values.role,
    is_active: Boolean(values.is_active),
  };
}

/**
 * `RN-71`: no se puede dejar la instalación sin superadministrador activo. El
 * backend es la autoridad; esto solo permite adelantar el aviso en la UI a
 * partir del listado ya traído.
 */
export function isLastActiveSuper(user, users) {
  if (user.role !== 'super_administrator' || !user.is_active) return false;
  const activos = (users ?? []).filter(
    (otro) => otro.role === 'super_administrator' && otro.is_active,
  );
  return activos.length === 1 && activos[0].id === user.id;
}
