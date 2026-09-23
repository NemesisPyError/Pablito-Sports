import { useState } from 'react';

import styles from './PasswordField.module.css';

/**
 * Campo de contraseña con botón para mostrar/ocultar el valor.
 *
 * Envuelve un `<input>` normal: recibe las mismas props (`value`, `onChange`,
 * `className`, `autoComplete`, etc.) y decide internamente `type="password"`
 * o `type="text"`. Así funciona igual en los tres lugares donde hoy hay un
 * campo de contraseña (login, alta de usuario, cambio de contraseña), cada
 * uno con su propia clase de estilo.
 *
 * El botón es `type="button"` para no enviar el formulario al tocarlo, y
 * queda en el orden natural del tabulador (no se le saca el foco por
 * teclado): mostrar la contraseña es útil también para quien no usa mouse.
 */
export function PasswordField({ id, className, toggleClassName, ...rest }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.wrapper}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: '2.5rem' }}
        {...rest}
      />
      <button
        type="button"
        className={`${styles.toggle} ${toggleClassName ?? ''}`}
        onClick={() => setVisible((actual) => !actual)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 3l18 18M10.6 5.1a10.6 10.6 0 0 1 1.4-.1c5 0 9 4.5 10 7a12.6 12.6 0 0 1-2.6 3.9M6.5
           6.6C4 8.3 2.4 10.7 2 12c.8 2.3 3.7 6 10 6 1.3 0 2.5-.2 3.5-.5M9.9
           9.9a3 3 0 0 0 4.2 4.2"
      />
    </svg>
  );
}
