import { describe, expect, it } from 'vitest';

import {
  isLastActiveSuper,
  roleLabel,
  toCreatePayload,
  toUpdatePayload,
  toFormValues,
  validatePasswordChange,
  validateUser,
} from './userForm.js';

const USER = {
  id: 3,
  username: 'ana',
  email: 'ana@pablitosports.test',
  role: 'administrator',
  is_active: true,
};

describe('toFormValues', () => {
  it('parte de un objeto vacío y activo cuando no hay usuario', () => {
    expect(toFormValues(null)).toEqual({
      username: '',
      email: '',
      role: 'administrator',
      is_active: true,
      password: '',
    });
  });

  it('nunca carga la contraseña de un usuario existente', () => {
    expect(toFormValues({ ...USER, password_hash: 'x' }).password).toBe('');
  });
});

describe('validateUser', () => {
  it('exige usuario, correo y contraseña en el alta', () => {
    const errores = validateUser({ username: '', email: '', role: 'administrator', password: '' });
    expect(Object.keys(errores).sort()).toEqual(['email', 'password', 'username']);
  });

  it('rechaza un correo sin formato de dirección', () => {
    const errores = validateUser({
      username: 'ana',
      email: 'ana-arroba-nada',
      role: 'administrator',
      password: 'clave-larga',
    });
    expect(errores.email).toBeTruthy();
  });

  it('rechaza una contraseña de menos de 12 caracteres (03_SEGURIDAD.md §5.5)', () => {
    const errores = validateUser({
      username: 'ana',
      email: 'ana@x.co',
      role: 'administrator',
      password: 'corta',
    });
    expect(errores.password).toContain('12');
  });

  it('en edición no mira la contraseña: tiene su propio flujo (§9.14)', () => {
    const errores = validateUser(
      { username: 'ana', email: 'ana@x.co', role: 'administrator', password: '' },
      { isEdit: true },
    );
    expect(errores.password).toBeUndefined();
  });

  it('rechaza un rol fuera del conjunto cerrado', () => {
    const errores = validateUser({
      username: 'ana',
      email: 'ana@x.co',
      role: 'root',
      password: 'clave-larga',
    });
    expect(errores.role).toBeTruthy();
  });

  it('acepta un alta completa y válida', () => {
    expect(
      validateUser({
        username: 'ana',
        email: 'ana@pablitosports.test',
        role: 'super_administrator',
        password: 'clave-suficiente',
      }),
    ).toEqual({});
  });
});

describe('validatePasswordChange', () => {
  it('exige la contraseña actual solo cuando se cambia la propia', () => {
    const propia = validatePasswordChange(
      { currentPassword: '', newPassword: 'clave-nueva', confirmPassword: 'clave-nueva' },
      { requireCurrent: true },
    );
    expect(propia.currentPassword).toBeTruthy();

    const ajena = validatePasswordChange(
      { currentPassword: '', newPassword: 'clave-nueva', confirmPassword: 'clave-nueva' },
      { requireCurrent: false },
    );
    expect(ajena.currentPassword).toBeUndefined();
  });

  it('detecta que la confirmación no coincide', () => {
    const errores = validatePasswordChange({
      newPassword: 'clave-nueva',
      confirmPassword: 'otra-cosa',
    });
    expect(errores.confirmPassword).toBeTruthy();
  });

  it('aplica la política de 12 caracteres a la nueva contraseña', () => {
    const errores = validatePasswordChange({ newPassword: 'corta', confirmPassword: 'corta' });
    expect(errores.newPassword).toContain('12');
  });

  it('acepta justo el mínimo y rechaza uno menos', () => {
    // El aviso del formulario tiene que cortar donde corta el servidor: si
    // aceptara once, el backend devolvería un 422 que el usuario no esperaba.
    const doce = 'abcdefghijkm';
    expect(doce).toHaveLength(12);

    const valida = validatePasswordChange({ newPassword: doce, confirmPassword: doce });
    const once = validatePasswordChange({ newPassword: doce.slice(0, 11), confirmPassword: doce.slice(0, 11) });

    expect(valida.newPassword).toBeUndefined();
    expect(once.newPassword).toBeTruthy();
  });

  it('acepta un cambio bien formado', () => {
    expect(
      validatePasswordChange(
        {
          currentPassword: 'la-actual',
          newPassword: 'la-nueva-larga',
          confirmPassword: 'la-nueva-larga',
        },
        { requireCurrent: true },
      ),
    ).toEqual({});
  });
});

describe('toCreatePayload / toUpdatePayload', () => {
  it('el alta manda contraseña y no manda is_active', () => {
    const payload = toCreatePayload({
      username: '  ana  ',
      email: '  ana@x.co ',
      role: 'administrator',
      password: 'clave-larga',
      is_active: true,
    });
    expect(payload).toEqual({
      username: 'ana',
      email: 'ana@x.co',
      role: 'administrator',
      password: 'clave-larga',
    });
  });

  it('la edición manda is_active y nunca la contraseña', () => {
    const payload = toUpdatePayload({
      username: 'ana',
      email: 'ana@x.co',
      role: 'super_administrator',
      is_active: false,
      password: 'no-deberia-viajar',
    });
    expect(payload).toEqual({
      username: 'ana',
      email: 'ana@x.co',
      role: 'super_administrator',
      is_active: false,
    });
    expect(payload).not.toHaveProperty('password');
  });
});

describe('isLastActiveSuper (RN-71, aviso de UI)', () => {
  const superA = { id: 1, role: 'super_administrator', is_active: true };
  const superB = { id: 2, role: 'super_administrator', is_active: true };
  const admin = { id: 3, role: 'administrator', is_active: true };

  it('marca al único superadministrador activo', () => {
    expect(isLastActiveSuper(superA, [superA, admin])).toBe(true);
  });

  it('no lo marca si hay otro superadministrador activo', () => {
    expect(isLastActiveSuper(superA, [superA, superB])).toBe(false);
  });

  it('un administrador común nunca es el último superadministrador', () => {
    expect(isLastActiveSuper(admin, [admin])).toBe(false);
  });

  it('un superadministrador inactivo no cuenta', () => {
    expect(isLastActiveSuper({ ...superA, is_active: false }, [{ ...superA, is_active: false }])).toBe(
      false,
    );
  });
});

describe('roleLabel', () => {
  it('traduce los dos roles del contrato', () => {
    expect(roleLabel('administrator')).toBe('Administrador');
    expect(roleLabel('super_administrator')).toBe('Superadministrador');
  });

  it('muestra un rol desconocido tal cual en vez de ocultarlo', () => {
    expect(roleLabel('futuro_rol')).toBe('futuro_rol');
  });
});
