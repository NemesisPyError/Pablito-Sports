import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pablito.admin.theme';
const THEMES = ['light', 'dark'];

function leerTemaGuardado() {
  try {
    const valor = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(valor) ? valor : 'light';
  } catch {
    // Almacenamiento bloqueado (navegación privada, política del navegador):
    // el panel sigue funcionando, solo no recuerda la preferencia.
    return 'light';
  }
}

/**
 * Preferencia de tema del panel administrativo (claro/oscuro).
 *
 * Vive solo acá, aislada de la tienda pública: `AdminLayout` aplica el
 * resultado como `data-theme` en su contenedor raíz (`.shell`), nunca en
 * `<html>`/`<body>` — ese contenedor no existe fuera del panel, así que la
 * tienda no puede heredar nada de este tema.
 */
export function useAdminTheme() {
  const [theme, setTheme] = useState(leerTemaGuardado);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Sin almacenamiento disponible la preferencia no persiste entre
      // visitas, pero el cambio de tema en esta sesión sigue funcionando.
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((actual) => (actual === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggleTheme };
}
