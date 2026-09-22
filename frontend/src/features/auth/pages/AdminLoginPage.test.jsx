import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * El acceso al panel, después de vestirlo de azul.
 *
 * El rediseño del 09/09/2026 solo tocó la presentación, y esta suite existe
 * justamente para poder afirmarlo: fija lo que **no** debía cambiar —los campos
 * con su `label` y su `autocomplete`, el botón que no se habilita a medias, el
 * mensaje que nunca dice cuál de los dos datos falló— junto a lo que sí es
 * nuevo: el logotipo.
 *
 * Lo del `autocomplete` no es un detalle: sin `current-password` el gestor de
 * contraseñas del navegador no ofrece rellenar, y la alternativa es que la
 * contraseña se escriba a mano cada vez.
 *
 * `createRoot` + `act`, el patrón del proyecto.
 */

const sesion = { isAuthenticated: false, isLoading: false };
const login = { mutate: vi.fn(), isPending: false, isError: false, error: null };

vi.mock('../hooks/useAdminAuth.js', () => ({
  useAdminAuth: () => sesion,
  useAdminLogin: () => login,
}));

const { AdminLoginPage } = await import('./AdminLoginPage.jsx');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let contenedor;
let raiz;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);

  sesion.isAuthenticated = false;
  sesion.isLoading = false;
  login.mutate = vi.fn();
  login.isPending = false;
  login.isError = false;
  login.error = null;
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
  vi.clearAllMocks();
});

function montar() {
  act(() =>
    raiz.render(
      <MemoryRouter>
        <AdminLoginPage />
      </MemoryRouter>,
    ),
  );
}

const porId = (id) => contenedor.querySelector(`#${id}`);
const boton = () => contenedor.querySelector('button[type="submit"]');

function escribir(elemento, valor) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(elemento, valor);
    elemento.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

function completar(usuario = 'admin', clave = 'una-clave-larga') {
  escribir(porId('username'), usuario);
  escribir(porId('password'), clave);
}

// ---------------------------------------------------------------------------
// Lo nuevo: el logotipo
// ---------------------------------------------------------------------------

describe('el logotipo', () => {
  it('muestra el nombre de la tienda', () => {
    montar();

    expect(contenedor.querySelector('h1').textContent).toContain('PablitoSports');
  });

  it('es el encabezado de la pantalla, no un adorno suelto', () => {
    montar();

    expect(contenedor.querySelectorAll('h1')).toHaveLength(1);
  });

  it('sigue identificando la pantalla como el panel', () => {
    montar();

    expect(contenedor.textContent).toContain('Panel administrativo');
  });

  it('no carga ninguna imagen: la identidad es tipográfica', () => {
    // Un `<img>` acá sería una petición de red que puede fallar y dejar la
    // pantalla sin marca; el texto no.
    montar();

    expect(contenedor.querySelector('img')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Lo que no debía cambiar
// ---------------------------------------------------------------------------

describe('los campos', () => {
  it('cada uno conserva su etiqueta asociada', () => {
    montar();
    const etiquetas = [...contenedor.querySelectorAll('label')].map((l) => [
      l.getAttribute('for'),
      l.textContent,
    ]);

    expect(etiquetas).toEqual([
      ['username', 'Usuario'],
      ['password', 'Contraseña'],
    ]);
  });

  it('la contraseña se escribe oculta', () => {
    montar();

    expect(porId('password').getAttribute('type')).toBe('password');
  });

  it('conserva el `autocomplete` que necesita el gestor de contraseñas', () => {
    montar();

    expect(porId('username').getAttribute('autocomplete')).toBe('username');
    expect(porId('password').getAttribute('autocomplete')).toBe('current-password');
  });

  it('ambos campos son alcanzables por teclado', () => {
    montar();

    expect(porId('username').tagName).toBe('INPUT');
    expect(porId('username').hasAttribute('disabled')).toBe(false);
    expect(porId('password').hasAttribute('disabled')).toBe(false);
  });
});

describe('el botón de ingresar', () => {
  it('está deshabilitado mientras falte algún dato', () => {
    montar();
    expect(boton().disabled).toBe(true);

    escribir(porId('username'), 'admin');
    expect(boton().disabled).toBe(true);
  });

  it('se habilita con los dos datos cargados', () => {
    montar();
    completar();

    expect(boton().disabled).toBe(false);
  });

  it('envía las credenciales tal como se escribieron', () => {
    montar();
    completar('admin', 'una-clave-larga');
    act(() =>
      contenedor
        .querySelector('form')
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );

    expect(login.mutate).toHaveBeenCalledTimes(1);
    expect(login.mutate.mock.calls[0][0]).toEqual({
      username: 'admin',
      password: 'una-clave-larga',
    });
  });

  it('durante el envío indica el progreso y no se puede volver a pulsar', () => {
    login.isPending = true;
    montar();
    completar();

    expect(boton().textContent).toContain('Ingresando');
    expect(boton().disabled).toBe(true);
  });
});

describe('los errores', () => {
  it('un 401 no dice cuál de los dos datos falló', () => {
    // §16.1: distinguir "ese usuario no existe" de "la contraseña no es esa"
    // le regala al atacante la mitad del trabajo.
    login.isError = true;
    login.error = { status: 401 };
    montar();

    const alerta = contenedor.querySelector('[role="alert"]');
    expect(alerta.textContent).toBe('Usuario o contraseña incorrectos.');
  });

  it('el aviso se anuncia como alerta', () => {
    login.isError = true;
    login.error = { status: 401 };
    montar();

    expect(contenedor.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('un 429 explica que hay que esperar', () => {
    login.isError = true;
    login.error = { status: 429 };
    montar();

    expect(contenedor.querySelector('[role="alert"]').textContent).toContain('Esperá');
  });

  it('un fallo de red se distingue de una credencial incorrecta', () => {
    login.isError = true;
    login.error = { isNetworkFailure: true };
    montar();

    expect(contenedor.querySelector('[role="alert"]').textContent).toContain('conectar');
  });

  it('sin error no hay ninguna alerta en pantalla', () => {
    montar();

    expect(contenedor.querySelector('[role="alert"]')).toBeNull();
  });
});
