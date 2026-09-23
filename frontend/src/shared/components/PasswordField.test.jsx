import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordField } from './PasswordField.jsx';

/**
 * El botón de mostrar/ocultar es lo único propio de este componente: el resto
 * (`value`, `onChange`, validación) sigue siendo responsabilidad de quien lo
 * usa, como con un `<input>` normal.
 */

let contenedor;
let root;

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  root = createRoot(contenedor);
});

afterEach(() => {
  act(() => root.unmount());
  contenedor.remove();
});

function montar(props = {}) {
  act(() => {
    root.render(<PasswordField id="clave" value="secreta" onChange={vi.fn()} {...props} />);
  });
}

function disparar(elemento, tipo) {
  elemento.dispatchEvent(new Event(tipo, { bubbles: true, cancelable: true }));
}

describe('PasswordField', () => {
  it('arranca oculto (type="password")', () => {
    montar();

    expect(document.getElementById('clave').getAttribute('type')).toBe('password');
  });

  it('el botón revela el valor al tocarlo', () => {
    montar();
    const boton = contenedor.querySelector('button');

    act(() => disparar(boton, 'click'));

    expect(document.getElementById('clave').getAttribute('type')).toBe('text');
  });

  it('tocarlo de nuevo lo vuelve a ocultar', () => {
    montar();
    const boton = contenedor.querySelector('button');

    act(() => disparar(boton, 'click'));
    act(() => disparar(boton, 'click'));

    expect(document.getElementById('clave').getAttribute('type')).toBe('password');
  });

  it('el botón es type="button", para no enviar el formulario que lo contenga', () => {
    montar();

    expect(contenedor.querySelector('button').getAttribute('type')).toBe('button');
  });

  it('el aria-label describe la acción disponible, no el estado actual', () => {
    montar();
    const boton = contenedor.querySelector('button');

    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña');

    act(() => disparar(boton, 'click'));

    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
  });

  it('pasa el resto de las props al input (autoComplete, className, required)', () => {
    montar({ className: 'form-control is-invalid', autoComplete: 'new-password', required: true });
    const input = document.getElementById('clave');

    expect(input.className).toBe('form-control is-invalid');
    expect(input.getAttribute('autocomplete')).toBe('new-password');
    expect(input.hasAttribute('required')).toBe(true);
  });
});
